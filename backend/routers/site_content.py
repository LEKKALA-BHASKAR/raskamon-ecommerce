"""Site content router — dynamic homepage & navigation content management.

Public read endpoints power the user-facing site; admin write endpoints power
the admin panel. Everything that the user sees on the homepage and in the
navigation is sourced from here, not from hardcoded frontend data.

Collections:
- site_content_col: keyed singletons (hero, flash_sale, bestsellers, new_arrivals, nav)
- testimonials_col: per-row CRUD
- social_videos_col: per-row CRUD
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
import uuid

from database import (
    site_content_col, testimonials_col, social_videos_col, categories_col,
)
from utils.security import require_admin
from utils.helpers import serialize_doc, now

router = APIRouter()


# ─── Shared helpers ──────────────────────────────────────────────────────────

async def _get_kv(key: str, default: Any):
    doc = await site_content_col.find_one({'key': key})
    if not doc:
        return default
    return doc.get('value', default)


async def _set_kv(key: str, value: Any):
    await site_content_col.update_one(
        {'key': key},
        {'$set': {'key': key, 'value': value, 'updatedAt': now()}},
        upsert=True,
    )
    return value


def _is_scheduled_active(item: dict) -> bool:
    """Check optional startsAt / endsAt window (epoch ms or ISO). True if in window."""
    if item.get('isActive') is False:
        return False
    n = datetime.utcnow().timestamp() * 1000
    s = item.get('startsAt')
    e = item.get('endsAt')

    def _ms(v):
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        try:
            return datetime.fromisoformat(str(v).replace('Z', '+00:00')).timestamp() * 1000
        except Exception:
            return None

    sm, em = _ms(s), _ms(e)
    if sm is not None and n < sm:
        return False
    if em is not None and n > em:
        return False
    return True


# ─── Hero Slides ─────────────────────────────────────────────────────────────

class CTA(BaseModel):
    label: str
    link: str
    style: Optional[str] = 'primary'  # primary | secondary | ghost


class HeroSlide(BaseModel):
    id: Optional[str] = None
    badge: Optional[str] = ''
    title: str
    subtitle: Optional[str] = ''
    image: Optional[str] = ''
    accent: Optional[str] = '#A3E635'
    isActive: bool = True
    order: Optional[int] = 0
    ctas: Optional[List[CTA]] = []
    startsAt: Optional[Any] = None  # epoch ms or ISO string
    endsAt: Optional[Any] = None
    # legacy/back-compat (still accepted, frontend normalises)
    primaryCtaLabel: Optional[str] = None
    primaryCtaLink: Optional[str] = None
    secondaryCtaLabel: Optional[str] = None
    secondaryCtaLink: Optional[str] = None


class HeroSlidesIn(BaseModel):
    slides: List[HeroSlide]


@router.get('/site/hero')
async def get_hero_slides_public():
    slides = await _get_kv('hero', [])
    return [s for s in slides if _is_scheduled_active(s)]


@router.get('/admin/hero-slides')
async def get_hero_slides_admin(_=Depends(require_admin)):
    return await _get_kv('hero', [])


@router.put('/admin/hero-slides')
async def put_hero_slides(payload: HeroSlidesIn, _=Depends(require_admin)):
    slides = [s.dict() for s in payload.slides]
    for i, s in enumerate(slides):
        if not s.get('id'):
            s['id'] = f"hs_{uuid.uuid4().hex[:8]}"
        if s.get('order') in (None, 0):
            s['order'] = i
    await _set_kv('hero', slides)
    return slides


# ─── Flash Sale ──────────────────────────────────────────────────────────────

class FlashSaleIn(BaseModel):
    enabled: bool = True
    title: Optional[str] = "Today's Best Deals"
    subtitle: Optional[str] = ''
    badge: Optional[str] = 'Flash Sale — Limited Time'
    startsAt: Optional[Any] = None
    endsAt: Optional[Any] = None
    productIds: List[str] = []


@router.get('/site/flash-sale')
async def get_flash_sale_public():
    cfg = await _get_kv('flash_sale', {'enabled': False, 'productIds': []})
    if not cfg.get('enabled'):
        return {**cfg, 'enabled': False}
    if not _is_scheduled_active(cfg):
        return {**cfg, 'enabled': False}
    return cfg


@router.get('/admin/flash-sale')
async def get_flash_sale_admin(_=Depends(require_admin)):
    return await _get_kv('flash_sale', {'enabled': True, 'productIds': []})


@router.put('/admin/flash-sale')
async def put_flash_sale(payload: FlashSaleIn, _=Depends(require_admin)):
    return await _set_kv('flash_sale', payload.dict())


# ─── Curated lists (bestsellers, new arrivals) ───────────────────────────────

class CuratedIn(BaseModel):
    productIds: List[str]


@router.get('/site/curated/{name}')
async def get_curated_public(name: str):
    if name not in ('bestsellers', 'new_arrivals', 'new-arrivals'):
        raise HTTPException(404, 'Unknown curated list')
    key = 'new_arrivals' if name in ('new_arrivals', 'new-arrivals') else 'bestsellers'
    cfg = await _get_kv(key, {'productIds': []})
    return cfg


@router.get('/admin/curated/{name}')
async def get_curated_admin(name: str, _=Depends(require_admin)):
    if name not in ('bestsellers', 'new_arrivals', 'new-arrivals'):
        raise HTTPException(404, 'Unknown curated list')
    key = 'new_arrivals' if name in ('new_arrivals', 'new-arrivals') else 'bestsellers'
    return await _get_kv(key, {'productIds': []})


@router.put('/admin/curated/{name}')
async def put_curated(name: str, payload: CuratedIn, _=Depends(require_admin)):
    if name not in ('bestsellers', 'new_arrivals', 'new-arrivals'):
        raise HTTPException(404, 'Unknown curated list')
    key = 'new_arrivals' if name in ('new_arrivals', 'new-arrivals') else 'bestsellers'
    return await _set_kv(key, payload.dict())


# ─── Testimonials ────────────────────────────────────────────────────────────

class TestimonialIn(BaseModel):
    name: str
    city: Optional[str] = ''
    rating: int = 5
    text: str
    avatar: Optional[str] = ''
    isActive: bool = True
    order: Optional[int] = 0


@router.get('/site/testimonials')
async def list_testimonials_public():
    rows = await testimonials_col.find({'isActive': True}).sort([('order', 1)]).to_list(50)
    return serialize_doc(rows)


@router.get('/admin/testimonials')
async def list_testimonials_admin(_=Depends(require_admin)):
    rows = await testimonials_col.find({}).sort([('order', 1)]).to_list(200)
    return serialize_doc(rows)


@router.post('/admin/testimonials')
async def create_testimonial(payload: TestimonialIn, _=Depends(require_admin)):
    doc = payload.dict()
    doc['id'] = f"t_{uuid.uuid4().hex[:8]}"
    doc['createdAt'] = now()
    await testimonials_col.insert_one(doc)
    return serialize_doc(doc)


@router.put('/admin/testimonials/{tid}')
async def update_testimonial(tid: str, payload: TestimonialIn, _=Depends(require_admin)):
    res = await testimonials_col.update_one({'id': tid}, {'$set': payload.dict()})
    if res.matched_count == 0:
        raise HTTPException(404, 'Not found')
    doc = await testimonials_col.find_one({'id': tid})
    return serialize_doc(doc)


@router.delete('/admin/testimonials/{tid}')
async def delete_testimonial(tid: str, _=Depends(require_admin)):
    await testimonials_col.delete_one({'id': tid})
    return {'ok': True}


# ─── Social Videos ───────────────────────────────────────────────────────────

class SocialVideoIn(BaseModel):
    platform: str = 'youtube'  # youtube | instagram | facebook
    type: str = 'video'  # video | reel | short
    title: str
    embedUrl: str
    thumbnail: Optional[str] = ''
    views: Optional[str] = ''
    duration: Optional[str] = ''
    channel: Optional[str] = ''
    isActive: bool = True
    order: Optional[int] = 0


@router.get('/site/social-videos')
async def list_videos_public():
    rows = await social_videos_col.find({'isActive': True}).sort([('order', 1)]).to_list(50)
    return serialize_doc(rows)


@router.get('/admin/social-videos')
async def list_videos_admin(_=Depends(require_admin)):
    rows = await social_videos_col.find({}).sort([('order', 1)]).to_list(200)
    return serialize_doc(rows)


@router.post('/admin/social-videos')
async def create_video(payload: SocialVideoIn, _=Depends(require_admin)):
    doc = payload.dict()
    doc['id'] = f"v_{uuid.uuid4().hex[:8]}"
    doc['createdAt'] = now()
    await social_videos_col.insert_one(doc)
    return serialize_doc(doc)


@router.put('/admin/social-videos/{vid}')
async def update_video(vid: str, payload: SocialVideoIn, _=Depends(require_admin)):
    res = await social_videos_col.update_one({'id': vid}, {'$set': payload.dict()})
    if res.matched_count == 0:
        raise HTTPException(404, 'Not found')
    doc = await social_videos_col.find_one({'id': vid})
    return serialize_doc(doc)


@router.delete('/admin/social-videos/{vid}')
async def delete_video(vid: str, _=Depends(require_admin)):
    await social_videos_col.delete_one({'id': vid})
    return {'ok': True}


# ─── Navigation (header + footer + announcements) ────────────────────────────

DEFAULT_NAV = {
    'announcements': [
        '🌿 Free delivery on orders above ₹499 — Across India',
        '✨ Use code WELLNESS15 for 15% off on your first order',
    ],
    'footer': {
        'tagline': "Premium Ayurvedic wellness crafted with ancient wisdom for modern lives.",
        'helpLinks': [
            {'label': 'About Us', 'to': '/about'},
            {'label': 'Contact Us', 'to': '/contact'},
            {'label': 'FAQ', 'to': '/faq'},
            {'label': 'Blog', 'to': '/blog'},
            {'label': 'Shipping & Returns', 'to': '/shipping'},
            {'label': 'Privacy Policy', 'to': '/privacy'},
            {'label': 'Terms & Conditions', 'to': '/terms'},
        ],
        'contact': {
            'email': 'info@drmediscie.com',
            'phone': '+91-8860908070',
            'address': 'Delhi, New Delhi, 110034',
        },
        'socials': {
            'instagram': '#', 'facebook': '#', 'twitter': '#', 'youtube': '#',
        },
    },
    'simpleLinks': [
        {'label': 'Blog', 'href': '/blog'},
        {'label': 'About Us', 'href': '/about'},
    ],
}


class NavIn(BaseModel):
    announcements: Optional[List[str]] = None
    footer: Optional[dict] = None
    simpleLinks: Optional[List[dict]] = None


async def _build_category_nav() -> List[dict]:
    """Build top-nav from categories collection (parent → children)."""
    cats = await categories_col.find({}).sort([('order', 1)]).to_list(200)
    cats = serialize_doc(cats)
    children = {}
    parents = []
    for c in cats:
        if c.get('parent'):
            children.setdefault(c['parent'], []).append(c)
        else:
            parents.append(c)
    out = []
    for p in parents:
        subs = children.get(p['id'], [])
        out.append({
            'id': p['id'],
            'label': p.get('name'),
            'slug': p.get('slug'),
            'icon': p.get('icon', ''),
            'href': f"/products?category={p.get('name', '')}",
            'sub': [
                {'label': s.get('name'), 'href': f"/products?category={p.get('name', '')}&subcategory={s.get('name', '')}"}
                for s in subs
            ],
        })
    return out


@router.get('/site/nav')
async def get_nav_public():
    cfg = await _get_kv('nav', DEFAULT_NAV)
    cfg['categories'] = await _build_category_nav()
    return cfg


@router.get('/admin/nav')
async def get_nav_admin(_=Depends(require_admin)):
    cfg = await _get_kv('nav', DEFAULT_NAV)
    return cfg


@router.put('/admin/nav')
async def put_nav(payload: NavIn, _=Depends(require_admin)):
    current = await _get_kv('nav', DEFAULT_NAV)
    patch = {k: v for k, v in payload.dict().items() if v is not None}
    merged = {**current, **patch}
    return await _set_kv('nav', merged)


# ─── Generic content blocks (trust_badges, portal_section, features_strip, stats_bar) ─
# These power marketing copy that previously lived as hardcoded arrays in components.

ALLOWED_BLOCK_KEYS = {
    'trust_badges',       # [{ icon, label, sub }]
    'features_strip',     # [{ icon, text }]
    'portal_section',     # { heading, subheading, cards: [...] }
    'stats_bar',          # [{ icon, value, label, color }]
    'offers',             # [{ id, title, subtitle, image, link, badge, isActive, order, startsAt, endsAt }]
    'featured_products',  # { title, subtitle, productIds: [...] }
    'homepage_layout',    # [{ key, enabled, order }] — admin-controlled section ordering
    'about_page',         # { title, body, image, mission, vision, values: [...] }
    'contact_info',       # { email, phone, address, hours, mapEmbed }
}


class BlockIn(BaseModel):
    value: Any


@router.get('/site/blocks/{key}')
async def get_block_public(key: str):
    if key not in ALLOWED_BLOCK_KEYS:
        raise HTTPException(404, 'Unknown block')
    return await _get_kv(key, [] if key in ('trust_badges', 'features_strip', 'stats_bar') else {})


@router.get('/admin/blocks/{key}')
async def get_block_admin(key: str, _=Depends(require_admin)):
    if key not in ALLOWED_BLOCK_KEYS:
        raise HTTPException(404, 'Unknown block')
    return await _get_kv(key, [] if key in ('trust_badges', 'features_strip', 'stats_bar') else {})


@router.put('/admin/blocks/{key}')
async def put_block(key: str, payload: BlockIn, _=Depends(require_admin)):
    if key not in ALLOWED_BLOCK_KEYS:
        raise HTTPException(404, 'Unknown block')
    return await _set_kv(key, payload.value)
