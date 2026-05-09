"""Social Feed router — auto-fetch posts/videos from YouTube, Instagram, Facebook.

Collections:
  social_accounts_col  — one doc per platform storing API credentials + account identifiers
  social_feed_col      — fetched items (thumbnail, caption, publishedAt, redirectUrl)

Admin endpoints:
  GET  /admin/social-accounts            — list configured platforms
  PUT  /admin/social-accounts/{platform} — save/update platform config
  POST /admin/social-accounts/sync       — manual sync (all enabled platforms)
  GET  /admin/social-feed                — fetched content list
  DELETE /admin/social-feed/{item_id}    — remove a fetched item

Public endpoints:
  GET  /site/social-feed                 — active fetched items (latest first)
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from database import social_accounts_col, social_feed_col
from utils.helpers import serialize_doc, now
from utils.security import require_admin

log = logging.getLogger(__name__)
router = APIRouter()

PLATFORMS = ("youtube", "instagram", "facebook")


# ─── Models ──────────────────────────────────────────────────────────────────

class SocialAccountIn(BaseModel):
    enabled: bool = True
    # YouTube
    youtube_api_key: Optional[str] = None
    youtube_channel_id: Optional[str] = None
    youtube_max_results: Optional[int] = 9
    # Instagram (Graph API — requires Instagram Professional + FB Business)
    instagram_access_token: Optional[str] = None
    instagram_user_id: Optional[str] = None    # numeric IG user ID
    instagram_max_results: Optional[int] = 9
    # Facebook (Graph API — page access token)
    facebook_access_token: Optional[str] = None
    facebook_page_id: Optional[str] = None
    facebook_max_results: Optional[int] = 9
    # RapidAPI fallback for Instagram (optional)
    rapidapi_key: Optional[str] = None
    instagram_username: Optional[str] = None   # used with RapidAPI
    # RapidAPI fallback for Facebook (optional)
    facebook_rapidapi_key: Optional[str] = None
    facebook_username: Optional[str] = None    # Facebook page username / ID for RapidAPI


# ─── Admin: account config ────────────────────────────────────────────────────

@router.get('/admin/social-accounts')
async def get_social_accounts(_=Depends(require_admin)):
    docs = await social_accounts_col.find({}).to_list(10)
    result = {p: {} for p in PLATFORMS}
    for doc in docs:
        p = doc.get('platform')
        if p in result:
            result[p] = serialize_doc(doc)
    return result


@router.put('/admin/social-accounts/{platform}')
async def put_social_account(platform: str, payload: SocialAccountIn, _=Depends(require_admin)):
    if platform not in PLATFORMS:
        raise HTTPException(400, f"Unknown platform. Must be one of: {', '.join(PLATFORMS)}")
    data = {k: v for k, v in payload.dict().items() if v is not None}
    data['platform'] = platform
    data['updatedAt'] = now()
    await social_accounts_col.update_one({'platform': platform}, {'$set': data}, upsert=True)
    doc = await social_accounts_col.find_one({'platform': platform})
    return serialize_doc(doc)


@router.post('/admin/social-accounts/sync')
async def trigger_sync(_=Depends(require_admin)):
    results = await _sync_all_platforms()
    return results


# ─── Admin: fetched content ───────────────────────────────────────────────────

@router.get('/admin/social-feed')
async def get_social_feed_admin(platform: Optional[str] = None, _=Depends(require_admin)):
    q = {}
    if platform and platform in PLATFORMS:
        q['platform'] = platform
    docs = await social_feed_col.find(q).sort([('publishedAt', -1)]).to_list(200)
    return serialize_doc(docs)


@router.delete('/admin/social-feed/{item_id}')
async def delete_feed_item(item_id: str, _=Depends(require_admin)):
    await social_feed_col.delete_one({'id': item_id})
    return {'ok': True}


@router.patch('/admin/social-feed/{item_id}')
async def patch_feed_item(item_id: str, payload: dict, _=Depends(require_admin)):
    allowed = {'isActive', 'caption', 'thumbnail'}
    update = {k: v for k, v in payload.items() if k in allowed}
    if not update:
        raise HTTPException(400, 'No valid fields to update')
    await social_feed_col.update_one({'id': item_id}, {'$set': update})
    doc = await social_feed_col.find_one({'id': item_id})
    return serialize_doc(doc)


# ─── Public ───────────────────────────────────────────────────────────────────

@router.get('/site/social-feed')
async def get_social_feed_public(limit: int = 12):
    docs = await social_feed_col.find({'isActive': True}).sort([('publishedAt', -1)]).to_list(limit)
    return serialize_doc(docs)


# ─── Sync logic ──────────────────────────────────────────────────────────────

async def _sync_all_platforms() -> Dict[str, Any]:
    docs = await social_accounts_col.find({'enabled': True}).to_list(10)
    accounts = {d['platform']: d for d in docs}

    results = {}
    tasks = []
    for platform, cfg in accounts.items():
        if platform == 'youtube':
            tasks.append(_sync_youtube(cfg))
        elif platform == 'instagram':
            tasks.append(_sync_instagram(cfg))
        elif platform == 'facebook':
            tasks.append(_sync_facebook(cfg))

    synced = await asyncio.gather(*tasks, return_exceptions=True)

    for (platform, _), result in zip(accounts.items(), synced):
        if isinstance(result, Exception):
            log.error(f"Sync failed for {platform}: {result}")
            results[platform] = {'status': 'error', 'error': str(result)}
            await social_accounts_col.update_one(
                {'platform': platform},
                {'$set': {'lastSyncStatus': 'error', 'lastSyncError': str(result), 'lastSyncAt': now()}}
            )
        else:
            results[platform] = result
            await social_accounts_col.update_one(
                {'platform': platform},
                {'$set': {'lastSyncStatus': 'ok', 'lastSyncAt': now(), 'lastSyncCount': result.get('upserted', 0)}}
            )

    return results


async def _upsert_feed_items(items: List[dict]) -> int:
    count = 0
    for item in items:
        ext_id = item.get('externalId')
        platform = item.get('platform')
        if not ext_id or not platform:
            continue
        item.setdefault('id', f"sf_{uuid.uuid4().hex[:10]}")
        item.setdefault('isActive', True)
        item.setdefault('fetchedAt', now())
        result = await social_feed_col.update_one(
            {'platform': platform, 'externalId': ext_id},
            {'$set': item},
            upsert=True
        )
        if result.upserted_id:
            count += 1
    return count


async def _sync_youtube(cfg: dict) -> dict:
    api_key = cfg.get('youtube_api_key')
    channel_id = cfg.get('youtube_channel_id')
    if not api_key or not channel_id:
        return {'status': 'skipped', 'reason': 'Missing youtube_api_key or youtube_channel_id'}

    max_results = cfg.get('youtube_max_results', 9)
    url = 'https://www.googleapis.com/youtube/v3/search'
    params = {
        'key': api_key,
        'channelId': channel_id,
        'part': 'snippet',
        'order': 'date',
        'maxResults': max_results,
        'type': 'video',
    }
    resp = requests.get(url, params=params, timeout=15)
    if not resp.ok:
        raise Exception(f"YouTube API error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    items = []
    for entry in data.get('items', []):
        vid_id = entry.get('id', {}).get('videoId')
        snippet = entry.get('snippet', {})
        if not vid_id:
            continue
        published_raw = snippet.get('publishedAt', '')
        try:
            published_dt = datetime.fromisoformat(published_raw.replace('Z', '+00:00'))
        except Exception:
            published_dt = datetime.now(timezone.utc)

        items.append({
            'platform': 'youtube',
            'type': 'video',
            'externalId': vid_id,
            'title': snippet.get('title', ''),
            'caption': snippet.get('description', ''),
            'thumbnail': (snippet.get('thumbnails', {}).get('high') or
                          snippet.get('thumbnails', {}).get('medium') or
                          snippet.get('thumbnails', {}).get('default') or {}).get('url', ''),
            'redirectUrl': f"https://www.youtube.com/watch?v={vid_id}",
            'embedUrl': f"https://www.youtube.com/embed/{vid_id}",
            'channelTitle': snippet.get('channelTitle', ''),
            'publishedAt': published_dt.isoformat(),
        })

    count = await _upsert_feed_items(items)
    return {'status': 'ok', 'fetched': len(items), 'upserted': count}


async def _sync_instagram(cfg: dict) -> dict:
    access_token = cfg.get('instagram_access_token')
    user_id = cfg.get('instagram_user_id')
    rapidapi_key = cfg.get('rapidapi_key')
    username = cfg.get('instagram_username')
    max_results = cfg.get('instagram_max_results', 9)

    # Try Instagram Graph API first (requires Professional account)
    if access_token and user_id:
        return await _sync_instagram_graph(access_token, user_id, max_results)

    # Fallback: RapidAPI (Instagram scraper)
    if rapidapi_key and username:
        return await _sync_instagram_rapidapi(rapidapi_key, username, max_results)

    return {'status': 'skipped', 'reason': 'No Instagram credentials configured'}


async def _sync_instagram_graph(access_token: str, user_id: str, max_results: int) -> dict:
    url = f"https://graph.instagram.com/{user_id}/media"
    params = {
        'fields': 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp',
        'access_token': access_token,
        'limit': max_results,
    }
    resp = requests.get(url, params=params, timeout=15)
    if not resp.ok:
        raise Exception(f"Instagram Graph API error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    items = []
    for entry in data.get('data', []):
        media_type = entry.get('media_type', 'IMAGE')
        try:
            published_dt = datetime.fromisoformat(entry.get('timestamp', '').replace('Z', '+00:00'))
        except Exception:
            published_dt = datetime.now(timezone.utc)

        thumbnail = entry.get('thumbnail_url') or entry.get('media_url', '')
        items.append({
            'platform': 'instagram',
            'type': 'reel' if media_type == 'VIDEO' else 'post',
            'externalId': entry.get('id'),
            'title': (entry.get('caption') or '')[:80],
            'caption': entry.get('caption', ''),
            'thumbnail': thumbnail,
            'redirectUrl': entry.get('permalink', ''),
            'publishedAt': published_dt.isoformat(),
        })

    count = await _upsert_feed_items(items)
    return {'status': 'ok', 'fetched': len(items), 'upserted': count}


async def _sync_instagram_rapidapi(rapidapi_key: str, username: str, max_results: int) -> dict:
    # Uses RapidAPI "Instagram Scraper" (instagram-scraper-2022.p.rapidapi.com or similar)
    url = "https://instagram-scraper-2022.p.rapidapi.com/ig/posts_username/"
    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": "instagram-scraper-2022.p.rapidapi.com",
    }
    params = {"user": username}
    resp = requests.get(url, headers=headers, params=params, timeout=15)
    if not resp.ok:
        raise Exception(f"RapidAPI Instagram error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    posts = data.get('data', {}).get('user', {}).get('edge_owner_to_timeline_media', {}).get('edges', [])
    items = []
    for edge in posts[:max_results]:
        node = edge.get('node', {})
        shortcode = node.get('shortcode', '')
        taken_at = node.get('taken_at_timestamp')
        try:
            published_dt = datetime.fromtimestamp(taken_at, tz=timezone.utc) if taken_at else datetime.now(timezone.utc)
        except Exception:
            published_dt = datetime.now(timezone.utc)

        caption = ''
        edges_cap = node.get('edge_media_to_caption', {}).get('edges', [])
        if edges_cap:
            caption = edges_cap[0].get('node', {}).get('text', '')

        thumbnail = node.get('thumbnail_src') or node.get('display_url', '')
        items.append({
            'platform': 'instagram',
            'type': 'reel' if node.get('is_video') else 'post',
            'externalId': node.get('id', shortcode),
            'title': caption[:80],
            'caption': caption,
            'thumbnail': thumbnail,
            'redirectUrl': f"https://www.instagram.com/p/{shortcode}/",
            'publishedAt': published_dt.isoformat(),
        })

    count = await _upsert_feed_items(items)
    return {'status': 'ok', 'fetched': len(items), 'upserted': count}


async def _sync_facebook(cfg: dict) -> dict:
    access_token = cfg.get('facebook_access_token')
    page_id = cfg.get('facebook_page_id')
    rapidapi_key = cfg.get('facebook_rapidapi_key')
    fb_username = cfg.get('facebook_username')
    max_results = cfg.get('facebook_max_results', 9)

    # Try Facebook Graph API first
    if access_token and page_id:
        return await _sync_facebook_graph(access_token, page_id, max_results)

    # Fallback: RapidAPI Facebook scraper
    if rapidapi_key and fb_username:
        return await _sync_facebook_rapidapi(rapidapi_key, fb_username, max_results)

    return {'status': 'skipped', 'reason': 'Missing Facebook credentials (Graph API or RapidAPI)'}


async def _sync_facebook_graph(access_token: str, page_id: str, max_results: int) -> dict:
    url = f"https://graph.facebook.com/v19.0/{page_id}/posts"
    params = {
        'fields': 'id,message,story,full_picture,permalink_url,created_time,attachments',
        'access_token': access_token,
        'limit': max_results,
    }
    resp = requests.get(url, params=params, timeout=15)
    if not resp.ok:
        raise Exception(f"Facebook Graph API error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    items = []
    for entry in data.get('data', []):
        try:
            published_dt = datetime.fromisoformat(entry.get('created_time', '').replace('+0000', '+00:00'))
        except Exception:
            published_dt = datetime.now(timezone.utc)

        caption = entry.get('message') or entry.get('story', '')
        thumbnail = entry.get('full_picture', '')
        attachments = entry.get('attachments', {}).get('data', [])
        if attachments:
            media = attachments[0].get('media', {})
            img = media.get('image', {})
            if img.get('src'):
                thumbnail = img['src']

        items.append({
            'platform': 'facebook',
            'type': 'post',
            'externalId': entry.get('id'),
            'title': caption[:80],
            'caption': caption,
            'thumbnail': thumbnail,
            'redirectUrl': entry.get('permalink_url', f"https://www.facebook.com/{page_id}"),
            'publishedAt': published_dt.isoformat(),
        })

    count = await _upsert_feed_items(items)
    return {'status': 'ok', 'fetched': len(items), 'upserted': count}


async def _sync_facebook_rapidapi(rapidapi_key: str, fb_username: str, max_results: int) -> dict:
    # Uses RapidAPI "Facebook Scraper" (facebook-scraper3.p.rapidapi.com)
    url = "https://facebook-scraper3.p.rapidapi.com/page/posts"
    headers = {
        "X-RapidAPI-Key": rapidapi_key,
        "X-RapidAPI-Host": "facebook-scraper3.p.rapidapi.com",
    }
    params = {"username": fb_username, "limit": max_results}
    resp = requests.get(url, headers=headers, params=params, timeout=15)
    if not resp.ok:
        raise Exception(f"RapidAPI Facebook error {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    posts = data.get('posts', data.get('data', []))
    items = []
    for post in posts[:max_results]:
        post_id = post.get('post_id') or post.get('id', '')
        message = post.get('text') or post.get('message') or post.get('story', '')
        thumbnail = post.get('image') or post.get('full_picture', '')
        permalink = post.get('post_url') or post.get('permalink_url') or f"https://www.facebook.com/{fb_username}"

        # Parse timestamp — RapidAPI may return epoch int or ISO string
        ts = post.get('timestamp') or post.get('created_time')
        try:
            if isinstance(ts, (int, float)):
                published_dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            elif ts:
                published_dt = datetime.fromisoformat(str(ts).replace('Z', '+00:00').replace('+0000', '+00:00'))
            else:
                published_dt = datetime.now(timezone.utc)
        except Exception:
            published_dt = datetime.now(timezone.utc)

        if not post_id:
            continue
        items.append({
            'platform': 'facebook',
            'type': 'post',
            'externalId': str(post_id),
            'title': message[:80],
            'caption': message,
            'thumbnail': thumbnail,
            'redirectUrl': permalink,
            'publishedAt': published_dt.isoformat(),
        })

    count = await _upsert_feed_items(items)
    return {'status': 'ok', 'fetched': len(items), 'upserted': count}
