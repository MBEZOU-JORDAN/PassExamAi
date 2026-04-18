from fastapi import Depends
from app.core.auth import get_user_from_token


def get_current_user(
    user: dict = Depends(get_user_from_token),
) -> dict:
    """
    Retourne l'utilisateur authentifié courant.
    
    Usage :
        @router.get("/me")
        async def get_me(current_user: dict = Depends(get_current_user)):
            return current_user
    """
    return user