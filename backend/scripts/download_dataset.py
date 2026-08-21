import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any

from app.dependencies import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("download_dataset")

# Rich multilingual seed passages covering science, technology, Indian heritage, geography, health, and renewable energy
MULTILINGUAL_SEED_DATA = [
    # English Passages
    {
        "query_id": "q_en_01",
        "passage_id": "p_en_01",
        "title": "Solar Photovoltaic Technology and Renewable Energy",
        "language": "en",
        "text": "Solar photovoltaic cells convert solar radiation directly into electrical energy through the photovoltaic effect. When photons strike semiconductor materials like silicon, electrons are excited into higher energy states, generating direct electrical current. Solar energy is abundant, produces zero greenhouse gas emissions during operation, and offers scalable distributed energy generation for industrial and residential grids.",
    },
    {
        "query_id": "q_en_02",
        "passage_id": "p_en_02",
        "title": "Photosynthesis and Plant Cellular Biology",
        "language": "en",
        "text": "Photosynthesis is the fundamental biological process through which green plants, algae, and cyanobacteria synthesize organic nutrients from atmospheric carbon dioxide and water using radiant solar energy. Chlorophyll pigments in chloroplasts absorb blue and red light wavelengths, producing glucose and releasing oxygen gas as a vital byproduct.",
    },
    {
        "query_id": "q_en_03",
        "passage_id": "p_en_03",
        "title": "Artificial Intelligence in Medical Imaging Diagnostics",
        "language": "en",
        "text": "Deep learning convolutional neural networks have demonstrated exceptional diagnostic accuracy in medical imaging, including early detection of pulmonary nodules on computed tomography scans, retinal microaneurysms in fundus photography, and cardiac arrhythmias in electrocardiography. AI integration streamlines clinical workflows and minimizes diagnostic variance.",
    },
    {
        "query_id": "q_en_04",
        "passage_id": "p_en_04",
        "title": "Cardiovascular Health and Preventive Medicine",
        "language": "en",
        "text": "Cardiovascular diseases remain the leading global cause of mortality. Primary preventive strategies include maintaining regular aerobic physical activity, adhering to dietary patterns rich in whole grains and unsaturated fatty acids, managing arterial hypertension, and avoiding tobacco consumption. Early biomarker screening substantially improves long-term outcomes.",
    },
    {
        "query_id": "q_en_05",
        "passage_id": "p_en_05",
        "title": "Plate Tectonics and Seismic Dynamics",
        "language": "en",
        "text": "Earthquakes occur as a result of sudden strain energy release along geological fault lines within the Earth's lithosphere. The tectonic plates constantly shift due to mantle convection currents. Transform boundaries, subduction zones, and divergent oceanic ridges create dynamic geological stress that causes seismic shockwaves.",
    },

    # Hindi (hi) Passages
    {
        "query_id": "q_hi_01",
        "passage_id": "p_hi_01",
        "title": "सौर ऊर्जा और फोटोवोल्टिक तकनीक",
        "language": "hi",
        "text": "सौर ऊर्जा सूर्य के प्रकाश और गर्मी से प्राप्त एक अक्षय और स्वच्छ ऊर्जा का स्रोत है। सौर फोटोवोल्टिक सेल सिलिकॉन जैसे अर्धचालकों का उपयोग करके सूर्य के प्रकाश को सीधे विद्युत ऊर्जा में परिवर्तित करते हैं। सौर ऊर्जा पर्यावरण को बिना किसी प्रदूषण के स्वच्छ बिजली प्रदान करती है और ग्रीनहाउस गैसों के उत्सर्जन को कम करती है।",
    },
    {
        "query_id": "q_hi_02",
        "passage_id": "p_hi_02",
        "title": "पौधों में प्रकाश संश्लेषण की प्रक्रिया",
        "language": "hi",
        "text": "प्रकाश संश्लेषण वह जैव रासायनिक प्रक्रिया है जिसके द्वारा हरे पौधे सूर्य के प्रकाश की उपस्थिति में कार्बन डाइऑक्साइड और जल की सहायता से अपना भोजन बनाते हैं। क्लोरोप्लास्ट में मौजूद क्लोरोफिल प्रकाश ऊर्जा को रासायनिक ऊर्जा में बदलता है और ग्लूकोज का निर्माण करता है, साथ ही जीवनदायी ऑक्सीजन मुक्त करता है।",
    },
    {
        "query_id": "q_hi_03",
        "passage_id": "p_hi_03",
        "title": "कृत्रिम बुद्धिमत्ता और स्वास्थ्य सेवा",
        "language": "hi",
        "text": "कृत्रिम बुद्धिमत्ता (AI) चिकित्सा निदान में क्रांतिकारी बदलाव ला रही है। डीप लर्निंग मॉडल सीटी स्कैन, एमआरआई और एक्स-रे छवियों का विश्लेषण करके रोगों का प्रारंभिक चरण में ही सटीक पता लगाने में डॉक्टरों की सहायता करते हैं।",
    },

    # Marathi (mr) Passages
    {
        "query_id": "q_mr_01",
        "passage_id": "p_mr_01",
        "title": "सौर ऊर्जा आणि शाश्वत विकास",
        "language": "mr",
        "text": "सौर ऊर्जा हा एक अत्यंत महत्त्वाचा आणि प्रदूषणमुक्त अक्षय ऊर्जा स्रोत आहे. फोटोव्होल्टेइक सेलच्या साहाय्याने सूर्यप्रकाशाचे थेट विजेमध्ये रूपांतर केले जाते. भारतामध्ये सौर ऊर्जेचा वापर वेगाने वाढत असून यामुळे कार्बन उत्सर्जन कमी होण्यास मोठी मदत होत आहे.",
    },
    {
        "query_id": "q_mr_02",
        "passage_id": "p_mr_02",
        "title": "भारतीय संस्कृती आणि कला परंपरा",
        "language": "mr",
        "text": "भारतीय संस्कृती ही विविधता, सहिष्णुता आणि प्राचीन कला परंपरांचे समृद्ध मिश्रण आहे. शास्त्रीय संगीत, नाट्यशास्त्र आणि ऐतिहासिक वास्तुकला ही भारताची जागतिक स्तरावर ओळख आहे.",
    },

    # Bengali (bn) Passages
    {
        "query_id": "q_bn_01",
        "passage_id": "p_bn_01",
        "title": "সৌরশক্তি এবং পুনর্নবীকরণযোগ্য প্রযুক্তি",
        "language": "bn",
        "text": "সৌরশক্তি হল একটি অফুরন্ত ও পরিবেশবান্ধব শক্তির উৎস। ফটোভোলটাইক কোষের মাধ্যমে সূর্যের আলোকে সরাসরি বিদ্যুতে রূপান্তরিত করা হয়। এটি কার্বন নির্গমন রোধ করে এবং জলবায়ু পরিবর্তন মোকাবিলায় গুরুত্বপূর্ণ ভূমিকা রাখে।",
    },
    {
        "query_id": "q_bn_02",
        "passage_id": "p_bn_02",
        "title": "উদ্ভিদের সালোকসংশ্লেষ প্রক্রিয়া",
        "language": "bn",
        "text": "সালোকসংশ্লেষ এমন একটি প্রক্রিয়া যার মাধ্যমে সবুজ উদ্ভিদ সূর্যালোক, জল এবং কার্বন ডাই অক্সাইড ব্যবহার করে শর্করা জাতীয় খাদ্য তৈরি করে এবং পরিবেশে অক্সিজেন সরবরাহ করে।",
    },

    # Tamil (ta) Passages
    {
        "query_id": "q_ta_01",
        "passage_id": "p_ta_01",
        "title": "சூரிய ஆற்றல் மற்றும் புதுப்பிக்கத்தக்க தொழில்நுட்பம்",
        "language": "ta",
        "text": "சூரிய ஆற்றல் என்பது இயற்கையாக கிடைக்கும் தூய்மையான மற்றும் புதுப்பிக்கத்தக்க ஆற்றல் மூலமாகும். சோலார் பேனல்கள் ஒளிமின்னழுத்த விளைவு மூலம் சூரிய ஒளியை நேரடியாக மின்சாரமாக மாற்றுகின்றன. இது காற்று மாசுபாட்டைக் குறைத்து நிலையான எதிர்காலத்தை உருவாக்குகிறது.",
    },

    # Telugu (te) Passages
    {
        "query_id": "q_te_01",
        "passage_id": "p_te_01",
        "title": "సౌర విద్యుత్ సాంకేతికత",
        "language": "te",
        "text": "సౌర శక్తి పర్యావరణ అనుకూలమైన పునరుత్పాదక శక్తి వనరు. ఫోటోవోల్టాయిక్ సెల్స్ ద్వారా సూర్యరశ్మిని విద్యుత్ శక్తిగా మారుస్తారు. ఇది గ్రీన్హౌస్ వాయువుల ఉద్గారాలను తగ్గించడంలో కీలక పాత్ర పోషిస్తుంది.",
    },

    # Gujarati (gu) Passages
    {
        "query_id": "q_gu_01",
        "passage_id": "p_gu_01",
        "title": "સૌર ઊર્જા અને નવીનીકરણીય સ્ત્રોતો",
        "language": "gu",
        "text": "સૌર ઊર્જા એ સ્વચ્છ, સુરક્ષિત અને અખૂટ કુદરતી ઊર્જાનો સ્ત્રોત છે. સોલાર સેલ વડે સૂર્યપ્રકાશનું વીજળીમાં રૂપાંતરણ કરવામાં આવે છે જે પર્યાવરણને પ્રદૂષણમુક્ત રાખવામાં સહાય કરે છે.",
    },

    # Kannada (kn) Passages
    {
        "query_id": "q_kn_01",
        "passage_id": "p_kn_01",
        "title": "ಸೌರ ಶಕ್ತಿ ಮತ್ತು ಸುಸ್ಥಿರ ಶಕ್ತಿ",
        "language": "kn",
        "text": "ಸೌರ ಶಕ್ತಿಯು ಪರಿಸರ ಸ್ನೇಹಿ ಮತ್ತು ನವೀಕರಿಸಬಹುದಾದ ಪ್ರಮುಖ ಶಕ್ತಿಯ ಮೂಲವಾಗಿದೆ. ಫೋಟೋವೋಲ್ಟಾಯಿಕ್ ತಂತ್ರಜ್ಞಾನದ ಮೂಲಕ ಸೂರ್ಯನ ಬೆಳಕನ್ನು ವಿದ್ಯುತ್ ಶಕ್ತಿಯನ್ನಾಗಿ ಪರಿವರ್ತಿಸಲಾಗುತ್ತದೆ.",
    },

    # Malayalam (ml) Passages
    {
        "query_id": "q_ml_01",
        "passage_id": "p_ml_01",
        "title": "സൗരോർജ്ജവും പുനരുപയോഗ ഊർജ്ജവും",
        "language": "ml",
        "text": "സൗരോർജ്ജം പരിസ്ഥിതി സൗഹൃദവും ഒരിക്കലും തീരാത്തതുമായ ഒരു ശുദ്ധമായ ഊർജ്ജ സ്രോതസ്സാണ്. ഫോട്ടോവോൾട്ടായിക് പാനലുകൾ ഉപയോഗിച്ച് സൂര്യപ്രകാശത്തെ നേരിട്ട് വൈദ്യുതിയാക്കി മാറ്റുന്നു.",
    },

    # Punjabi (pa) Passages
    {
        "query_id": "q_pa_01",
        "passage_id": "p_pa_01",
        "title": "ਸੌਰ ਊਰਜਾ ਅਤੇ ਸਾਫ਼ ਵਾਤਾਵਰਣ",
        "language": "pa",
        "text": "ਸੌਰ ਊਰਜਾ ਸੂਰਜ ਦੀ ਰੌਸ਼ਨੀ ਤੋਂ ਪ੍ਰਾਪਤ ਇੱਕ ਸਾਫ਼ ਅਤੇ ਨਵਿਆਉਣਯੋਗ ਊਰਜਾ ਸਰੋਤ ਹੈ। ਫੋਟੋਵੋਲਟਿਕ ਸੈੱਲ ਸੂਰਜੀ ਰੌਸ਼ਨੀ ਨੂੰ ਬਿਜਲੀ ਵਿੱਚ ਬਦਲਦੇ ਹਨ ਅਤੇ ਪ੍ਰਦੂਸ਼ਣ ਨੂੰ ਘਟਾਉਂਦੇ ਹਨ।",
    },
]


def download_or_generate_dataset(limit: int = 1000) -> List[Dict[str, Any]]:
    """
    Loads dataset from MSMARCO-XI or uses expanded multilingual seed data.
    """
    settings = get_settings()
    raw_path = settings.RAW_DATA_DIR / "dataset.json"

    logger.info(f"Targeting dataset: {settings.DATASET_NAME} (limit: {limit})")

    documents: List[Dict[str, Any]] = []

    # Attempt Hugging Face datasets stream if available
    try:
        from datasets import load_dataset
        logger.info(f"Connecting to Hugging Face dataset: {settings.DATASET_NAME}...")
        ds = load_dataset(settings.DATASET_NAME, split="train", streaming=True)
        count = 0
        for item in ds:
            doc = {
                "id": str(item.get("id", f"hf_{count}")),
                "query_id": str(item.get("query_id", f"q_{count}")),
                "passage_id": str(item.get("passage_id", f"p_{count}")),
                "title": item.get("title", f"Document #{count+1}"),
                "text": item.get("passage", item.get("text", "")),
                "language": item.get("language", "en"),
            }
            if doc["text"] and len(doc["text"].strip()) > 20:
                documents.append(doc)
                count += 1
            if count >= limit:
                break
        logger.info(f"Successfully streamed {len(documents)} documents from Hugging Face.")
    except Exception as e:
        logger.warning(f"Could not stream from Hugging Face ({e}). Generating rich multilingual corpus...")
        # Expand seed data dynamically up to limit
        for i in range(max(limit, len(MULTILINGUAL_SEED_DATA))):
            seed = MULTILINGUAL_SEED_DATA[i % len(MULTILINGUAL_SEED_DATA)]
            doc_id = f"doc_{seed['language']}_{i+1}"
            documents.append({
                "id": doc_id,
                "query_id": f"{seed['query_id']}_{i}",
                "passage_id": f"{seed['passage_id']}_{i}",
                "title": f"{seed['title']} (Vol. {i // len(MULTILINGUAL_SEED_DATA) + 1})",
                "text": seed["text"],
                "language": seed["language"],
            })

    # Save to disk
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=2)

    logger.info(f"Saved {len(documents)} documents to {raw_path}")
    return documents


if __name__ == "__main__":
    download_or_generate_dataset()
