"""Streamlit interactive frontend for ScholarAI – Your Future, Funded."""
import base64
import os
import time
import requests
import streamlit as st

API_BASE = os.getenv("FASTAPI_BASE_URL", "http://127.0.0.1:8000")

st.set_page_config(
    page_title="ScholarAI – Your Future, Funded",
    page_icon="🎓",
    layout="wide",
)

if "token" not in st.session_state:
    st.session_state.token = None
if "user" not in st.session_state:
    st.session_state.user = None
if "language" not in st.session_state:
    st.session_state.language = "English"

LANG_CODES = {
    "English": "en",
    "ಕನ್ನಡ (Kannada)": "kn",
    "हिन्दी (Hindi)": "hi",
}

SEC_QUESTION_KEYS = [
    "birth_city",
    "first_school",
    "childhood_nickname",
    "mother_name",
    "favorite_teacher",
    "favorite_pet_or_book",
]

SEC_QUESTION_LABELS = {
    "en": {
        "birth_city": "What city or town were you born in?",
        "first_school": "What was the name of your first primary school?",
        "childhood_nickname": "What was your childhood nickname?",
        "mother_name": "What is your mother's first name?",
        "favorite_teacher": "What was the name of your favorite school teacher?",
        "favorite_pet_or_book": "What is the name of your favorite childhood book or pet?",
    },
    "kn": {
        "birth_city": "ನೀವು ಹುಟ್ಟಿದ ನಗರ ಅಥವಾ ಪಟ್ಟಣ ಯಾವುದು?",
        "first_school": "ನಿಮ್ಮ ಮೊದಲ ಪ್ರಾಥಮಿಕ ಶಾಲೆಯ ಹೆಸರೇನು?",
        "childhood_nickname": "ನಿಮ್ಮ ಬಾಲ್ಯದ ಅಡ್ಡಹೆಸರು ಏನು?",
        "mother_name": "ನಿಮ್ಮ ತಾಯಿಯ ಮೊದಲ ಹೆಸರೇನು?",
        "favorite_teacher": "ನಿಮ್ಮ ನೆಚ್ಚಿನ ಶಾಲಾ ಶಿಕ್ಷಕರ ಹೆಸರೇನು?",
        "favorite_pet_or_book": "ನಿಮ್ಮ ಬಾಲ್ಯದ ನೆಚ್ಚಿನ ಪುಸ್ತಕ ಅಥವಾ ಸಾಕುಪ್ರಾಣಿಯ ಹೆಸರೇನು?",
    },
    "hi": {
        "birth_city": "आपका जन्म किस शहर या कस्बे में हुआ था?",
        "first_school": "आपके पहले प्राथमिक विद्यालय का नाम क्या था?",
        "childhood_nickname": "आपके बचपन का उपनाम क्या था?",
        "mother_name": "आपकी माताजी का पहला नाम क्या है?",
        "favorite_teacher": "आपके पसंदीदा स्कूल शिक्षक का नाम क्या था?",
        "favorite_pet_or_book": "आपकी बचपन की पसंदीदा किताब या पालतू जानवर का नाम क्या है?",
    },
}

LANG_MAP = {
    "English": {
        "title": "ScholarAI – Your Future, Funded",
        "subtitle": "Two-Agent Autonomous Indian Scholarship Discovery & Eligibility Verification",
        "intro": (
            "Agent 1 researches official government portals (NSP, Karnataka SSP, myScheme, Central Ministries) "
            "in real time. Agent 2 validates your profile deterministically and prepares a step-by-step "
            "application plan with an explicit human approval gate."
        ),
        "signin": "Sign In",
        "register": "Create Student Account",
        "dashboard": "Dashboard",
        "discover": "Live Discovery",
        "agents": "Agent Activity Center",
        "profile": "Student Profile",
        "dev": "Developer Mode",
        "signout": "Sign Out",
        "launch_btn": "Launch Agent 1 & Agent 2",
        "approve_btn": "Approve Portal Access (Human Confirmation)",
        "retrieved_metric": "Retrieved Official Schemes",
    },
    "ಕನ್ನಡ (Kannada)": {
        "title": "ScholarAI – ನಿಮ್ಮ ಭವಿಷ್ಯಕ್ಕೆ ಆರ್ಥಿಕ ನೆರವು",
        "subtitle": "ದ್ವಿ-ಏಜೆಂಟ್ ಸ್ವಾಯತ್ತ ಭಾರತೀಯ ವಿದ್ಯಾರ್ಥಿವೇತನ ಸಂಶೋಧನೆ ಮತ್ತು ಅರ್ಹತಾ ಪರಿಶೀಲನೆ",
        "intro": (
            "ಏಜೆಂಟ್ 1 ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ಗಳನ್ನು (NSP, ಕರ್ನಾಟಕ SSP, myScheme) ನೇರವಾಗಿ ಸಂಶೋಧಿಸುತ್ತದೆ. "
            "ಏಜೆಂಟ್ 2 ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಅನ್ನು ನಿಖರ ನಿಯಮಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ ಮಾನವ ಅನುಮೋದನೆಯೊಂದಿಗೆ ಅರ್ಜಿ ಯೋಜನೆಯನ್ನು ಸಿದ್ಧಪಡಿಸುತ್ತದೆ."
        ),
        "signin": "ಸೈನ್ ಇನ್",
        "register": "ವಿದ್ಯಾರ್ಥಿ ಖಾತೆ ತೆರೆಯಿರಿ",
        "dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
        "discover": "ನೇರ ಹುಡುಕಾಟ",
        "agents": "ಏಜೆಂಟ್ ಚಟುವಟಿಕೆ ಕೇಂದ್ರ",
        "profile": "ವಿದ್ಯಾರ್ಥಿ ಪ್ರೊಫೈಲ್",
        "dev": "ಡೆವಲಪರ್ ಮೋಡ್",
        "signout": "ಸೈನ್ ಔಟ್",
        "launch_btn": "ಏಜೆಂಟ್ 1 ಮತ್ತು 2 ಚಲಾಯಿಸಿ",
        "approve_btn": "ಪೋರ್ಟಲ್ ಅನುಮೋದಿಸಿ (ಮಾನವ ದೃಢೀಕರಣ)",
        "retrieved_metric": "ಪಡೆದ ಅಧಿಕೃತ ಯೋಜನೆಗಳು",
    },
    "हिन्दी (Hindi)": {
        "title": "ScholarAI – आपका भविष्य, सुरक्षित",
        "subtitle": "दो-एजेंट स्वायत्त भारतीय छात्रवृत्ति खोज एवं पात्रता सत्यापन मंच",
        "intro": (
            "एजेंट 1 आधिकारिक सरकारी पोर्टलों (NSP, कर्नाटक SSP, myScheme) पर लाइव शोध करता है। "
            "एजेंट 2 आपकी प्रोफ़ाइल की नियम-आधारित जाँच कर मानव स्वीकृति गेट के साथ चरण-दर-चरण आवेदन योजना बनाता है।"
        ),
        "signin": "साइन इन",
        "register": "छात्र खाता बनाएँ",
        "dashboard": "डैशबोर्ड",
        "discover": "लाइव खोज",
        "agents": "एजेंट गतिविधि केंद्र",
        "profile": "छात्र प्रोफ़ाइल",
        "dev": "डेवलपर मोड",
        "signout": "साइन आउट",
        "launch_btn": "एजेंट 1 और 2 चलाएँ",
        "approve_btn": "पोर्टल एक्सेस स्वीकृत करें (मानव पुष्टि)",
        "retrieved_metric": "प्राप्त आधिकारिक योजनाएँ",
    },
}

st.session_state.language = st.sidebar.selectbox(
    "Language / ಭಾಷೆ / भाषा",
    ["English", "ಕನ್ನಡ (Kannada)", "हिन्दी (Hindi)"],
    index=["English", "ಕನ್ನಡ (Kannada)", "हिन्दी (Hindi)"].index(st.session_state.language),
)
LANG_STR = LANG_MAP[st.session_state.language]
LANG_CODE = LANG_CODES[st.session_state.language]


def api_headers() -> dict:
    return {"Authorization": f"Bearer {st.session_state.token}"} if st.session_state.token else {}


def render_landing_and_auth():
    st.title(LANG_STR["title"])
    st.subheader(LANG_STR["subtitle"])
    st.write(LANG_STR["intro"])

    tab_login, tab_reg, tab_forgot = st.tabs([LANG_STR["signin"], LANG_STR["register"], "Forgot Password"])
    with tab_login:
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Password", type="password")
            submitted = st.form_submit_button(LANG_STR["signin"])
            if submitted:
                resp = requests.post(f"{API_BASE}/api/auth/login", json={"email": email, "password": password}, timeout=10)
                if resp.status_code == 200:
                    data = resp.json()
                    st.session_state.token = data["token"]
                    st.session_state.user = data["user"]
                    st.rerun()
                else:
                    st.error(resp.json().get("detail", "Login failed."))

    with tab_reg:
        q_labels = SEC_QUESTION_LABELS[LANG_CODE]
        with st.form("register_form"):
            full_name = st.text_input("Full Name")
            email = st.text_input("Email")
            password = st.text_input("Password (min 8 chars)", type="password")
            st.markdown("**Personal Security Questions (used to reset your password)**")
            q1 = st.selectbox("Security Question 1", SEC_QUESTION_KEYS, index=0, format_func=lambda k: q_labels[k])
            a1 = st.text_input("Answer 1")
            q2 = st.selectbox("Security Question 2", SEC_QUESTION_KEYS, index=1, format_func=lambda k: q_labels[k])
            a2 = st.text_input("Answer 2")
            q3 = st.selectbox("Security Question 3", SEC_QUESTION_KEYS, index=3, format_func=lambda k: q_labels[k])
            a3 = st.text_input("Answer 3")
            submitted = st.form_submit_button(LANG_STR["register"])
            if submitted:
                if len({q1, q2, q3}) != 3:
                    st.error("Please select 3 different personal security questions.")
                elif len(a1.strip()) < 2 or len(a2.strip()) < 2 or len(a3.strip()) < 2:
                    st.error("Please answer all 3 personal security questions (min 2 chars each).")
                else:
                    resp = requests.post(
                        f"{API_BASE}/api/auth/register",
                        json={
                            "full_name": full_name,
                            "email": email,
                            "password": password,
                            "security_questions": [
                                {"question_key": q1, "answer": a1.strip()},
                                {"question_key": q2, "answer": a2.strip()},
                                {"question_key": q3, "answer": a3.strip()},
                            ],
                        },
                        timeout=10,
                    )
                    if resp.status_code == 201:
                        data = resp.json()
                        st.session_state.token = data["token"]
                        st.session_state.user = data["user"]
                        st.rerun()
                    else:
                        st.error(resp.json().get("detail", "Registration failed."))

    with tab_forgot:
        q_labels = SEC_QUESTION_LABELS[LANG_CODE]
        with st.form("forgot_lookup_form"):
            reset_email = st.text_input("Registered Email Address")
            load_qs = st.form_submit_button("Load My Security Questions")
            if load_qs:
                resp = requests.post(
                    f"{API_BASE}/api/auth/forgot-password/questions",
                    json={"email": reset_email},
                    timeout=10,
                )
                if resp.status_code == 200:
                    st.session_state.reset_lookup_email = reset_email.strip().lower()
                    st.session_state.reset_questions = resp.json().get("questions", [])
                    st.success("Answer your 3 personal security questions below to set a new password.")
                else:
                    st.session_state.reset_questions = []
                    st.error(resp.json().get("detail", "Could not load security questions."))

        loaded_qs = st.session_state.get("reset_questions", [])
        if loaded_qs:
            with st.form("forgot_verify_form"):
                st.caption(f"Account: {st.session_state.get('reset_lookup_email', '')}")
                answers_payload = []
                for idx, item in enumerate(loaded_qs, start=1):
                    q_key = item["question_key"]
                    ans = st.text_input(f"{idx}. {q_labels.get(q_key, q_key)}", key=f"reset_ans_{q_key}")
                    answers_payload.append({"question_key": q_key, "answer": ans.strip()})
                new_pw = st.text_input("New Password (min 8 chars)", type="password")
                reset_submit = st.form_submit_button("Verify Answers & Change Password")
                if reset_submit:
                    resp = requests.post(
                        f"{API_BASE}/api/auth/reset-password",
                        json={
                            "email": st.session_state.get("reset_lookup_email", ""),
                            "answers": answers_payload,
                            "new_password": new_pw,
                        },
                        timeout=10,
                    )
                    if resp.status_code == 200:
                        st.session_state.reset_questions = []
                        st.success(resp.json().get("message", "Password updated successfully."))
                    else:
                        st.error(resp.json().get("detail", "Password reset failed."))


def render_workspace():
    st.sidebar.title("ScholarAI")
    st.sidebar.caption(f"Signed in as {st.session_state.user['full_name']}")
    nav_options = [
        ("dashboard", LANG_STR["dashboard"]),
        ("discover", LANG_STR["discover"]),
        ("agents", LANG_STR["agents"]),
        ("profile", LANG_STR["profile"]),
        ("dev", LANG_STR["dev"]),
    ]
    selected_label = st.sidebar.radio(
        "Navigation",
        [label for _, label in nav_options],
    )
    page_key = next(key for key, label in nav_options if label == selected_label)
    if st.sidebar.button(LANG_STR["signout"]):
        st.session_state.token = None
        st.session_state.user = None
        st.rerun()

    try:
        sys_stat = requests.get(f"{API_BASE}/api/system/status", timeout=5).json()
        if sys_stat.get("quota_status") not in (None, "OK"):
            st.error(
                f"Gemini Quota / Billing Notice ({sys_stat.get('gemini_model', '')}): "
                f"{sys_stat.get('last_quota_error', '')}"
            )
    except Exception:
        pass

    if page_key == "profile":
        st.header(LANG_STR["profile"])
        prof = requests.get(f"{API_BASE}/api/profile", headers=api_headers(), timeout=10).json()["profile"]
        if prof.get("profile_pic_url"):
            st.image(prof["profile_pic_url"], width=96, caption="Student Profile Photo")
        with st.form("profile_form"):
            uploaded_pic = st.file_uploader("Profile Photo (PNG / JPG)", type=["png", "jpg", "jpeg", "webp"])
            col1, col2 = st.columns(2)
            full_name = col1.text_input("Full Name", value=prof.get("full_name", ""))
            state = col2.text_input("State", value=prof.get("state", ""))
            category = col1.selectbox(
                "Category",
                ["", "General", "OBC", "SC", "ST", "EWS", "Minority"],
                index=0,
            )
            education_level = col2.text_input("Education Level", value=prof.get("education_level", ""))
            course = col1.text_input("Course", value=prof.get("course", ""))
            income = col2.number_input("Annual Family Income (INR)", min_value=0.0, value=float(prof.get("annual_family_income") or 0.0))
            pct = col1.number_input("Previous Percentage (%)", min_value=0.0, max_value=100.0, value=float(prof.get("previous_percentage") or 0.0))
            if st.form_submit_button("Save Profile"):
                pic_payload = prof.get("profile_pic_url", "")
                if uploaded_pic is not None:
                    b64 = base64.b64encode(uploaded_pic.getvalue()).decode("ascii")
                    mime = uploaded_pic.type or "image/png"
                    pic_payload = f"data:{mime};base64,{b64}"
                requests.put(
                    f"{API_BASE}/api/profile",
                    headers=api_headers(),
                    json={
                        "full_name": full_name,
                        "state": state,
                        "category": category or prof.get("category", ""),
                        "education_level": education_level,
                        "course": course,
                        "annual_family_income": income,
                        "previous_percentage": pct,
                        "profile_pic_url": pic_payload,
                    },
                    timeout=10,
                )
                st.success("Profile updated in MySQL.")
                st.rerun()

    elif page_key == "discover":
        st.header(LANG_STR["discover"])
        with st.form("research_form"):
            q = st.text_input("Search Query", placeholder="e.g. Karnataka SSP OBC Engineering Scholarship")
            s = st.text_input("State Filter")
            c = st.text_input("Category Filter")
            e = st.text_input("Education Filter")
            force_refresh = st.checkbox("Bypass verified cache & run fresh search", value=False)
            if st.form_submit_button(LANG_STR["launch_btn"]):
                r = requests.post(
                    f"{API_BASE}/api/research/start",
                    headers=api_headers(),
                    json={
                        "query_text": q,
                        "state_filter": s,
                        "category_filter": c,
                        "education_filter": e,
                        "language": LANG_CODE,
                        "force_refresh": force_refresh,
                    },
                    timeout=10,
                )
                if r.status_code == 202:
                    st.info(f"Task queued: {r.json()['task_id']}. Waiting for agents...")
                    time.sleep(2)
                    st.rerun()
                else:
                    st.error(r.json().get("detail", "Failed to start task."))

        items = requests.get(f"{API_BASE}/api/scholarships", headers=api_headers(), timeout=10).json()["scholarships"]
        for entry in items:
            sch = entry["scholarship"]
            rep = entry["eligibility_report"]
            plan = entry["application_plan"]
            with st.expander(f"{sch['official_name']} — {rep['outcome'] if rep else 'Pending'}"):
                st.write(sch["description"])
                st.write(f"**Ministry:** {sch['provider_ministry']} | **Deadline:** {sch['application_deadline']}")
                st.write(f"**Source:** {sch['source_url']}")
                if rep:
                    st.write("**Eligibility Explanation:**", rep["explanation_summary"])
                if plan:
                    app_num_val = st.text_input(
                        "Application Number / Portal Tracking ID",
                        value=plan.get("application_number", ""),
                        key=f"appnum_{plan['id']}",
                    )
                    if st.button("Save Application Number", key=f"save_appnum_{plan['id']}"):
                        requests.patch(
                            f"{API_BASE}/api/plans/{plan['id']}/checklist",
                            headers=api_headers(),
                            json={"application_number": app_num_val},
                            timeout=10,
                        )
                        st.success("Application Number saved.")
                        st.rerun()
                if plan and not plan["human_approved_portal_open"]:
                    if st.button(LANG_STR["approve_btn"], key=f"approve_{plan['id']}"):
                        requests.patch(
                            f"{API_BASE}/api/plans/{plan['id']}/stage",
                            headers=api_headers(),
                            json={"application_stage": "Portal Approved by Student", "human_approved": True},
                            timeout=10,
                        )
                        st.rerun()

    elif page_key == "agents":
        st.header(LANG_STR["agents"])
        tasks = requests.get(f"{API_BASE}/api/tasks", headers=api_headers(), timeout=10).json()["tasks"]
        for t in tasks:
            with st.expander(f"[{t['status']}] {t['query_text']} ({t['id'][:8]})"):
                detail = requests.get(f"{API_BASE}/api/tasks/{t['id']}", headers=api_headers(), timeout=10).json()
                st.write(
                    f"Task ID: `{t['id']}` | Agent 1: `{t['agent1_status']}` | "
                    f"Agent 2: `{t['agent2_status']}` | Retries: `{t.get('retry_count', 0)}`"
                )
                if t.get("error_message"):
                    st.error(t["error_message"])
                if t["status"] == "FAILED":
                    if st.button("Retry Task (Preserve ID & Logs)", key=f"retry_{t['id']}"):
                        rr = requests.post(
                            f"{API_BASE}/api/tasks/{t['id']}/retry",
                            headers=api_headers(),
                            json={"force_refresh": False},
                            timeout=10,
                        )
                        if rr.status_code == 202:
                            st.info(f"Retry queued for Task ID `{t['id']}`.")
                            time.sleep(1.5)
                            st.rerun()
                        else:
                            st.error(rr.json().get("detail", "Unable to retry task."))
                for msg in detail["messages"]:
                    st.json(msg)

    elif page_key == "dev":
        st.header(LANG_STR["dev"])
        st.warning("Test outputs are flagged is_test_data=True and separated from real student data.")
        with st.form("dev_form"):
            scenario = st.text_input("Scenario Name", value="Karnataka OBC B.E. Check")
            prompt = st.text_area("Custom Prompt")
            if st.form_submit_button("Run Sandbox Test"):
                r = requests.post(
                    f"{API_BASE}/api/research/developer-test",
                    headers=api_headers(),
                    json={
                        "scenario_name": scenario,
                        "custom_prompt": prompt,
                        "test_profile": {},
                        "language": LANG_CODE,
                    },
                    timeout=10,
                )
                st.write(r.json())

    else:
        st.header(LANG_STR["dashboard"])
        items = requests.get(f"{API_BASE}/api/scholarships", headers=api_headers(), timeout=10).json()["scholarships"]
        st.metric(LANG_STR["retrieved_metric"], len(items))


if st.session_state.token:
    render_workspace()
else:
    render_landing_and_auth()
