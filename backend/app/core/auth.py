# from fastapi import HTTPException, Security, status
# from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
# from jose import JWTError, jwt
# from app.core.config import settings

# security = HTTPBearer()


# def verify_supabase_jwt(
#     credentials: HTTPAuthorizationCredentials = Security(security),
# ) -> dict:
#     """
#     Valide le JWT Supabase sur chaque requête.
#     Retourne le payload décodé contenant user_id (sub), email, etc.
#     """
#     token = credentials.credentials
#     try:
#         payload = jwt.decode(
#             token,
#             settings.supabase_jwt_secret,
#             algorithms=["HS256"],
#             options={"verify_aud": False},  # Supabase n'utilise pas audience
#         )
#         user_id: str = payload.get("sub")
#         if user_id is None:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Token invalide : user_id manquant",
#             )
#         return payload

#     except JWTError as e:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail=f"Token invalide : {str(e)}",
#         )


import httpx
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings

security = HTTPBearer()


async def verify_supabase_jwt(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    token = credentials.credentials

    url = f"{settings.supabase_url}/auth/v1/user"

    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key,  # IMPORTANT: publishable/anon pour /auth/v1/user
    }

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, headers=headers)

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token invalide (Supabase): {resp.text}",
        )

    data = resp.json()

    # Supabase renvoie un objet user; selon le contexte, le "id" du user est souvent dans `id`
    user_id = data.get("id") or data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validé mais user id manquant: {data}",
        )

    return {
        "sub": user_id,
        "email": data.get("email", ""),
    }