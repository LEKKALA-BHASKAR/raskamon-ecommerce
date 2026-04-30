from fastapi import APIRouter, HTTPException
from database import categories_col
from utils.helpers import serialize_doc

router = APIRouter()


@router.get('')
@router.get('/')
async def get_categories():
    categories = await categories_col.find({}, sort=[('order', 1)]).to_list(100)
    return serialize_doc(categories)


@router.get('/tree')
async def get_category_tree():
    categories = await categories_col.find({}, sort=[('order', 1)]).to_list(200)
    cats = serialize_doc(categories)
    # Build tree
    tree = []
    children_map = {}
    for c in cats:
        if c.get('parent'):
            if c['parent'] not in children_map:
                children_map[c['parent']] = []
            children_map[c['parent']].append(c)
        else:
            tree.append(c)
    for cat in tree:
        cat['children'] = children_map.get(cat['id'], [])
    return tree


@router.get('/{slug}')
async def get_category(slug: str):
    cat = await categories_col.find_one({'slug': slug})
    if not cat:
        raise HTTPException(status_code=404, detail='Category not found')
    return serialize_doc(cat)
