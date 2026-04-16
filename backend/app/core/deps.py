from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.auth import verify_supabase_jwt

security = HTTPBearer()


# def get_current_user(
#     payload: dict = Depends(verify_supabase_jwt),
# ) -> dict:
#     """
#     Dependency injectable dans toutes les routes.
#     Usage : current_user: dict = Depends(get_current_user)
#     Retourne : {"user_id": "...", "email": "..."}
#     """
#     return {
#         "user_id": payload["sub"],
#         "email": payload.get("email", ""),
#     }


def get_current_user(payload: dict = Depends(verify_supabase_jwt)) -> dict:
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="sub manquant")

    return {
        "user_id": sub,
        "email": payload.get("email", ""),
    }
    
# # app/api/deps.py (TEMPORAIRE POUR TEST)
# async def get_current_user():
#     # On simule un utilisateur connecté avec la bonne clé "user_id"
#     return {
#         "user_id": "af550c95-2f1a-4d90-976a-9b1abe246b2b", # Remplace par un vrai UUID Supabase si possible
#         "email": "test@example.com"
#     }
