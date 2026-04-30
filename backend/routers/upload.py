from fastapi import APIRouter, Depends
from database import products_col
from utils.helpers import serialize_doc
import cloudinary
import cloudinary.utils
import cloudinary.uploader
import os
import time

router = APIRouter()

cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
    api_key=os.environ.get('CLOUDINARY_API_KEY'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
    secure=True
)


@router.get('/signature')
async def get_upload_signature(
    folder: str = 'sattva/products',
    resource_type: str = 'image'
):
    timestamp = int(time.time())
    params = {'timestamp': timestamp, 'folder': folder}
    signature = cloudinary.utils.api_sign_request(params, os.environ.get('CLOUDINARY_API_SECRET', ''))
    return {
        'signature': signature,
        'timestamp': timestamp,
        'cloud_name': os.environ.get('CLOUDINARY_CLOUD_NAME'),
        'api_key': os.environ.get('CLOUDINARY_API_KEY'),
        'folder': folder,
        'resource_type': resource_type
    }


@router.delete('/{public_id:path}')
async def delete_asset(public_id: str):
    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        return result
    except Exception as e:
        return {'error': str(e)}
