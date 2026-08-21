import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from speech.sarvam_stt import get_stt
from app.schemas.rag import TranscribeResponse

logger = logging.getLogger("vaani_rag.api.voice")
router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form("auto"),
):
    """
    Speech-to-Text endpoint forwarding audio to Sarvam Saaras v3.
    """
    try:
        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Empty audio file provided.")

        stt_service = get_stt()
        lang_code = language if language != "auto" else "unknown"
        response = await stt_service.transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            filename=file.filename or "recording.wav",
            language_code=lang_code,
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in transcription endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
