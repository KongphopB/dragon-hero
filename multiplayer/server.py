import http.server
import json
import math
import mimetypes
import os
import queue
import random
import secrets
import socket
import socketserver
import threading
import time
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
DATA_DIR = BASE_DIR / "data"
QUESTIONS_FILE = DATA_DIR / "questions.json"
QUESTS_FILE = DATA_DIR / "quests.json"
CUSTOM_ASSETS_DIR = PUBLIC_DIR / "assets" / "custom"

PORT = int(os.environ.get("PORT", "8080"))

MISTAKE_META = {
    "MISS_W": {"label": "ลืมใส่น้ำหนัก W (mg)", "tip": "วัตถุที่มีมวลบนโลกต้องมีน้ำหนัก W = mg ชี้ลงแนวดิ่ง (270°) เสมอ"},
    "MISS_N": {"label": "ลืมใส่แรงตั้งฉาก N", "tip": "เมื่อวัตถุสัมผัสพื้นผิว ต้องมีแรงตั้งฉาก N ดันออกจากผิวเสมอ"},
    "MISS_T": {"label": "ลืมใส่แรงตึงเชือก T", "tip": "ทุกเส้นเชือกที่ผูกติดวัตถุจะออกแรงดึงตามแนวเชือกออกจากวัตถุ"},
    "MISS_F": {"label": "ลืมใส่แรงกระทำ F / แรงเสียดทาน f", "tip": "ตรวจสอบโจทย์ว่ามีแรงดึง/ผลัก F หรือผิวฝืดที่มีแรงเสียดทาน f หรือไม่"},
    "MISS_CONTACT": {"label": "ลืมแรงสัมผัสจากผนัง/วัตถุอื่น", "tip": "จุดสัมผัสระหว่างวัตถุหรือผนังลื่นมีแรงดันตั้งฉากผิวสัมผัสเสมอ (R, S, P, Q)"},
    "EXTRA_N": {"label": "ใส่แรง N ทั้งที่ไม่มีพื้นรองรับ", "tip": "วัตถุที่แขวนลอยด้วยเชือกอย่างเดียวไม่สัมผัสพื้น จึงไม่มีแรงตั้งฉาก N"},
    "EXTRA_FORCE": {"label": "ใส่แรงที่ไม่มีในระบบ", "tip": "เช็กเฉพาะสิ่งที่สัมผัสวัตถุนี้จริง ๆ + น้ำหนักของวัตถุเอง"},
    "INTERNAL_FORCE": {"label": "ใส่แรงภายในในมุมมองภาพรวม", "tip": "ในมุมมองภาพรวม (ทั้งระบบ) แรงระหว่าง A กับ B หักล้างกันเอง ไม่ต้องเขียน"},
    "N_VERTICAL": {"label": "วาง N ชี้ขึ้นตรงแทนที่จะตั้งฉากพื้นเอียง", "tip": "บนพื้นเอียงมุม θ แรง N ต้องตั้งฉากกับผิวเอียง (ชี้ที่ 90°+θ) ไม่ใช่ 90°"},
    "W_TILTED": {"label": "วางน้ำหนัก W เอียงตามพื้น (W ต้องดิ่งลงตรง 270°)", "tip": "แรงโน้มถ่วงดึงลงเข้าหาศูนย์กลางโลกเสมอ ทิศของ W จึงเป็น 270° ทุกกรณี"},
    "T_NOT_ROPE": {"label": "วางแรงตึงเชือกไม่ตรงแนวเชือก", "tip": "แรงตึงเชือก T ต้องชี้ตามแนวเส้นเชือกพุ่งออกจากวัตถุเท่านั้น"},
    "REVERSED": {"label": "กลับทิศแรงตรงข้าม 180°", "tip": "ระวังสับสนแรงกิริยา–ปฏิกิริยา หรือเช็กว่าพื้น/ผนังดันเข้าหรือออก"},
    "ANGLE_COMPLEMENT": {"label": "ใช้มุมผิด (สับสนมุม θ กับ 90°−θ)", "tip": "ตรวจสอบว่าโจทย์วัดมุมเทียบกับแนวราบหรือแนวดิ่ง แล้วใช้ 180°−θ / 90°+θ ให้ถูก"},
    "FRICTION_DIR": {"label": "แรงเสียดทาน f ผิดทิศ", "tip": "แรงเสียดทาน f มีทิศต้านการเคลื่อนที่หรือต้านแนวโน้มการไถลเสมอ"},
    "SIN_COS_SWAP": {"label": "แตกแรงสลับ sin กับ cos", "tip": "จำง่าย ๆ: 'ชิดมุมใช้ cos ห่างมุมใช้ sin' เช็กว่ามุม θ อยู่ติดแกนไหน"},
    "WRONG_AXIS": {"label": "วางองค์ประกอบของแรงผิดแกน", "tip": "แยกให้ออกว่าองค์ประกอบไหนอยู่แกน X/ขนานพื้นเอียง และอันไหนอยู่แกน Y/ตั้งฉาก"},
    "COMPONENT_SIGN": {"label": "วางองค์ประกอบถูกแกนแต่ผิดทิศ (+/-)", "tip": "เช็กหัวลูกศรของแรงเดิมว่าพุ่งไปทาง + หรือ - ของแต่ละแกน"},
}

ALL_CARDS = ["double", "freeze", "shield", "magnifier", "second_chance", "heal"]
JOB_START_CARD = {
    "warrior": "double",
    "archer": "freeze",
    "mage": "magnifier",
    "knight": "shield",
    "priest": "heal",
}

BAD_WORDS = ["ควย", "เหี้ย", "สัส", "เย็ด", "มึง", "กู", "fuck", "shit", "bitch"]

data_lock = threading.RLock()


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def sanitize_name(name: str):
    cleaned = (name or "").strip()[:18]
    if not cleaned:
        return "นักผจญภัย"
    low = cleaned.lower()
    for bw in BAD_WORDS:
        if bw in low:
            cleaned = cleaned.replace(bw, "***")
    return cleaned


def angle_diff(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def ok_angle(a: float, b: float, tol: float = 6.0) -> bool:
    return angle_diff(a, b) <= tol


def sanitize_question_for_player(q: dict) -> dict:
    """Strip answer keys and explanation before sending to student during QUESTION phase."""
    forbidden = {"ex", "exComp", "exEq", "why", "traps"}
    return {k: v for k, v in q.items() if k not in forbidden}


def _strip_sin_cos(label: str):
    if "sin" in label:
        return label.replace("sin", "COS_OR_SIN"), "sin"
    if "cos" in label:
        return label.replace("cos", "COS_OR_SIN"), "cos"
    return label, None


def _base_force_name(label: str):
    return label.split(" ")[0].strip()


def _to_ang_list(val):
    if val is None:
        return []
    return list(val) if isinstance(val, list) else [val]


def grade_answer(q: dict, place: dict) -> dict:
    """
    Grade a student's answer (`place`) against question `q` (Types A, B, C, and D cos/sin).
    Supports repeatable contact force arrays (e.g. P: [37, 143]) and fallback plain forces (W, F, T).
    Returns: acc (0..1), outcome ('correct'|'partial'|'wrong'), codes (list),
             rows (list of feedback dicts), wrongItems (list for second_chance).
    """
    qtype = q.get("type", "A")
    is_multi = bool(q.get("k") == "ws" or str(q.get("k", "")).startswith("b"))
    tol = float(q.get("tol", 15 if is_multi else 12))
    place = place or {}
    codes = []
    rows = []
    wrong_items = []

    def add_code(c):
        if c and c not in codes:
            codes.append(c)

    views = ["A", "B"] if is_multi else ["all"]
    total_score = 0.0

    # Check if student accidentally placed internal forces on 'all' view in multi-body
    if is_multi and isinstance(place.get("all"), dict) and len(place.get("all")) > 0:
        all_ans = place.get("all") or {}
        if any(k in ("P", "Q") for k in all_ans):
            add_code("INTERNAL_FORCE")

    fb_map = q.get("fallbackForces") or {}

    for v in views:
        expected = q["ex"] if isinstance(q["ex"], list) else q["ex"].get(v, [])
        p0 = place.get(v) or {}
        hit = 0.0
        extra = 0
        if is_multi:
            vn = q.get("vn", ["ภาพรวม", "โฟกัส A", "โฟกัส B"])
            vlabel = vn[1] if v == "A" else vn[2]
            rows.append({"view": v, "header": vlabel})

        avail = {k: _to_ang_list(val) for k, val in p0.items()}
        replaced_by_fb = {}

        for fb_key, fb in fb_map.items():
            fb_angs = avail.get(fb_key) or []
            if fb_angs:
                replaces = fb.get("replaces") or []
                none_decomposed = all(not (avail.get(rk)) for rk in replaces)
                if none_decomposed and ok_angle(float(fb_angs[0]), float(fb["angle"]), tol):
                    for rk in replaces:
                        replaced_by_fb[rk] = fb_key
                    credit = float(fb.get("credit", 0.6))
                    hit += len(replaces) * credit
                    avail[fb_key] = fb_angs[1:]
                    rows.append({
                        "view": v,
                        "force": fb_key,
                        "status": "ok",
                        "msg": f"วาง {fb_key} ถูกทิศ แต่ยังไม่แตกแรง cos/sin (ได้คะแนน {round(credit * 100)}% แทน {', '.join(replaces)})",
                    })

        for f_key, exp_ang in expected:
            if f_key in replaced_by_fb:
                continue
            lst = avail.get(f_key) or []
            match_idx = next((idx for idx, ang in enumerate(lst) if ok_angle(float(ang), float(exp_ang), tol)), None)
            if match_idx is not None:
                hit += 1.0
                lst.pop(match_idx)
                avail[f_key] = lst
                rows.append({"view": v, "force": f_key, "status": "ok", "msg": "ถูกต้อง"})
            elif not lst:
                _, trig = _strip_sin_cos(f_key)
                swapped_key = (f_key.replace("sin", "cos") if "sin" in f_key else f_key.replace("cos", "sin")) if trig else None
                sw_lst = avail.get(swapped_key) or [] if swapped_key else []
                sw_idx = next((idx for idx, ang in enumerate(sw_lst) if ok_angle(float(ang), float(exp_ang), tol)), None)
                if sw_idx is not None:
                    add_code("SIN_COS_SWAP")
                    sw_lst.pop(sw_idx)
                    avail[swapped_key] = sw_lst
                    rows.append({"view": v, "force": f_key, "status": "dir", "msg": f"ใส่ {swapped_key} แทน {f_key} (สลับ sin/cos)"})
                else:
                    rows.append({"view": v, "force": f_key, "status": "miss", "msg": "ลืมใส่แรงนี้"})
                    if f_key == "W" or f_key == "mg" or f_key.startswith("mg"):
                        add_code("MISS_W")
                    elif f_key == "N":
                        add_code("MISS_N")
                    elif f_key in ("T", "U") or f_key.startswith("T"):
                        add_code("MISS_T")
                    elif f_key in ("f", "F") or f_key.startswith("F"):
                        add_code("MISS_F")
                    else:
                        add_code("MISS_CONTACT")
                wrong_items.append(f"{v}:{f_key}" if is_multi else f_key)
            else:
                ua = float(lst.pop(0))
                avail[f_key] = lst
                ea = float(exp_ang)
                rows.append({"view": v, "force": f_key, "status": "dir", "msg": f"ทิศไม่ถูก (วาง {int(round(ua))}°)"})
                wrong_items.append(f"{v}:{f_key}" if is_multi else f_key)

                if f_key == "W" and not ok_angle(ua, 270, tol):
                    add_code("W_TILTED")
                elif f_key == "N" and q.get("ia") and ok_angle(ua, 90, 12):
                    add_code("N_VERTICAL")
                elif ok_angle(ua, (ea + 180) % 360, 15):
                    if f_key == "f":
                        add_code("FRICTION_DIR")
                    else:
                        add_code("COMPONENT_SIGN" if qtype == "D" else "REVERSED")
                elif qtype == "D" and (ok_angle(ua, (ea + 90) % 360, 15) or ok_angle(ua, (ea + 270) % 360, 15)):
                    add_code("WRONG_AXIS")
                    if _strip_sin_cos(f_key)[1]:
                        add_code("SIN_COS_SWAP")
                elif f_key == "f":
                    add_code("FRICTION_DIR")
                elif f_key in ("T", "U"):
                    comp_horiz = (180 - ea) % 360 if ea < 180 else (540 - ea) % 360
                    comp90 = (90 - (ea % 90)) % 90
                    if ok_angle(ua % 90, comp90, 10) or ok_angle(ua, comp_horiz, 10):
                        add_code("ANGLE_COMPLEMENT")
                    add_code("T_NOT_ROPE")
                else:
                    add_code("ANGLE_COMPLEMENT")

        for uk, ulist in avail.items():
            for raw_ang in ulist:
                ua = float(raw_ang)
                extra += 1
                if uk in fb_map:
                    if not ok_angle(ua, float(fb_map[uk]["angle"]), tol):
                        if uk == "W":
                            add_code("W_TILTED")
                        rows.append({"view": v, "force": uk, "status": "dir", "msg": f"วาง {uk} ผิดทิศ ({int(round(ua))}°)"})
                    else:
                        rows.append({"view": v, "force": uk, "status": "extra", "msg": f"แตกแรงเป็น cos/sin แล้ว ไม่ต้องใส่ {uk} ซ้ำ"})
                else:
                    rows.append({"view": v, "force": uk, "status": "extra", "msg": "ไม่มีแรงนี้ (หรือวางเกินจำนวน)"})
                    add_code("EXTRA_N" if uk == "N" else "EXTRA_FORCE")
                wrong_items.append(f"{v}:{uk}" if is_multi else uk)

        if len(expected) > 0:
            total_score += max(0.0, hit - 0.5 * extra) / len(expected)

    acc = round(total_score / len(views), 4)

    # Custom traps from question
    for trap in q.get("traps", []):
        fk = trap.get("force")
        tang = trap.get("angle")
        tcode = trap.get("code")
        p_all = place.get("all") or place.get("A") or {}
        if fk in p_all and tang is not None and ok_angle(float(p_all[fk]), float(tang), tol + 2):
            add_code(tcode)

    if acc >= 0.999:
        acc = 1.0
        outcome = "correct"
    elif acc >= 0.5:
        outcome = "partial"
    else:
        outcome = "wrong"

    return {
        "acc": acc,
        "outcome": outcome,
        "codes": codes,
        "rows": rows,
        "wrongItems": wrong_items,
    }


class GameRoom:
    def __init__(self, pin: str, quest: dict, questions_by_id: dict):
        self.pin = pin
        self.host_token = secrets.token_hex(16)
        self.quest = quest
        self.questions_by_id = questions_by_id
        self.settings = dict(quest.get("settings", {}))
        self.stages = quest.get("stages", [])

        self.phase = "LOBBY"  # LOBBY, INTRO, ENCOUNTER, QUESTION, REVEAL, BATTLE, LEADERBOARD, MON_DEFEAT, MON_ESCAPE, VICTORY, DEFEAT, FINAL_BOARD, MISTAKE_REPORT
        self.paused = False
        self.hold_explain = False
        self.pause_remaining_ms = 0

        self.stage_idx = 0
        self.q_in_stage = 0
        self.q_global = 0
        self.used_qids = set()

        self.phase_started_at = time.time() * 1000
        self.phase_ends_at = 0

        self.monster = {
            "id": "slime",
            "name": "ราชาสไลม์",
            "subtitle": "",
            "img": "/assets/slime.png",
            "hp": 1000,
            "maxHp": 1000,
            "isBoss": False,
            "phase": 1,
        }
        self.boss_hp_bonus = 0.0  # +5% per escaped monster, or bonus dmg from overkill
        self.bonus_boss_dmg = 0

        self.players = {}  # uid -> player dict
        self.answers = {}  # uid -> submission dict for current question
        self.results = {}  # uid -> graded result for current question
        self.current_sync_qid = None
        self.player_qids = {}  # uid -> qid for current question
        self.cutscene_cast = []  # list of uids featured on host screen
        self.battle_actors = []  # 5 slots with outcome, dmg, etc.
        self.defeat_fate = "burn"  # 'eat' or 'burn'
        self.room_stats = {}  # reveal stats for host
        self.prev_ranks = {}  # uid -> rank before this question
        self.last_room_dmg = 0
        self.heal_bonus_pct = 0

        self.sse_clients = []  # list of (queue.Queue, role, uid)
        self.version = 1

    def active_stage(self):
        if 0 <= self.stage_idx < len(self.stages):
            return self.stages[self.stage_idx]
        return self.stages[-1]

    def now_ms(self):
        return time.time() * 1000

    def bump(self):
        self.version += 1
        dead = []
        for q, role, uid in list(self.sse_clients):
            try:
                payload = self.build_view(role, uid)
                q.put_nowait(payload)
            except Exception:
                dead.append((q, role, uid))
        for item in dead:
            if item in self.sse_clients:
                self.sse_clients.remove(item)

    def set_phase(self, phase: str, duration_s: float = 0):
        self.phase = phase
        self.paused = False
        self.hold_explain = False
        now = self.now_ms()
        self.phase_started_at = now
        self.phase_ends_at = (now + duration_s * 1000) if duration_s > 0 else 0

    def init_stage_monster(self):
        st = self.active_stage()
        n_players = max(1, len(self.players))
        q_count = max(1, int(st.get("count", 2)))
        base_dmg = int(st.get("baseDmg", 100))
        is_boss = bool(st.get("isBoss", False))
        k = float(self.settings.get("bossK", 0.65) if is_boss else self.settings.get("stageK", 0.60))
        max_hp = max(150, round(n_players * q_count * base_dmg * k))
        if is_boss and self.boss_hp_bonus > 0:
            max_hp = round(max_hp * (1.0 + self.boss_hp_bonus))
        hp = max_hp
        if is_boss and self.bonus_boss_dmg > 0:
            hp = max(round(max_hp * 0.2), max_hp - self.bonus_boss_dmg)
        self.monster = {
            "id": st["monsterId"],
            "name": st["name"],
            "subtitle": st.get("subtitle", ""),
            "img": st["img"],
            "phaseImgs": st.get("phaseImgs", [st["img"]]),
            "hp": hp,
            "maxHp": max_hp,
            "isBoss": is_boss,
            "phase": 1,
            "mode": st.get("mode", "sync"),
            "qCount": q_count,
            "baseDmg": base_dmg,
        }
        self.q_in_stage = 0

    def update_boss_phase_img(self):
        if not self.monster.get("isBoss"):
            return
        ratio = self.monster["hp"] / max(1, self.monster["maxHp"])
        imgs = self.monster.get("phaseImgs") or [self.monster["img"]]
        if ratio > 0.66:
            self.monster["phase"] = 1
            self.monster["img"] = imgs[0]
        elif ratio > 0.33:
            self.monster["phase"] = 2
            self.monster["img"] = imgs[min(1, len(imgs) - 1)]
        else:
            self.monster["phase"] = 3
            self.monster["img"] = imgs[min(2, len(imgs) - 1)]

    def pick_question_for_stage(self, exclude=None):
        st = self.active_stage()
        pool = [qid for qid in st.get("qIds", []) if qid in self.questions_by_id]
        if not pool:
            pool = list(self.questions_by_id.keys())
        unused = [qid for qid in pool if qid not in self.used_qids and (not exclude or qid not in exclude)]
        if not unused:
            unused = [qid for qid in pool if not exclude or qid not in exclude]
        if not unused:
            unused = pool
        return random.choice(unused)

    def start_question_round(self):
        self.q_in_stage += 1
        self.q_global += 1
        st = self.active_stage()
        mode = st.get("mode", "sync")
        self.answers = {}
        self.results = {}
        self.player_qids = {}
        self.heal_bonus_pct = 0

        # Snapshot current ranks for delta arrows
        sorted_p = sorted(self.players.values(), key=lambda p: (-p["dmg"], -p["accSum"], p["timeSum"]))
        self.prev_ranks = {p["uid"]: idx + 1 for idx, p in enumerate(sorted_p)}

        if mode == "sync":
            qid = self.pick_question_for_stage()
            self.used_qids.add(qid)
            self.current_sync_qid = qid
            q = self.questions_by_id[qid]
            dur = float(q.get("tm", 25))
            for uid in self.players:
                self.player_qids[uid] = qid
        else:
            self.current_sync_qid = None
            max_tm = 25.0
            for uid, p in self.players.items():
                qid = self.pick_question_for_stage(exclude=p.get("seenQids"))
                p.setdefault("seenQids", []).append(qid)
                self.player_qids[uid] = qid
                max_tm = max(max_tm, float(self.questions_by_id[qid].get("tm", 25)))
            dur = max_tm

        self.set_phase("QUESTION", dur)
        # Schedule bots to answer during QUESTION
        for uid, p in self.players.items():
            if p.get("isBot"):
                threading.Thread(target=self._bot_answer_worker, args=(uid, self.q_global, dur), daemon=True).start()

    def _bot_answer_worker(self, uid: str, q_num: int, dur: float):
        delay = random.uniform(2.2, max(3.5, dur * 0.72))
        time.sleep(delay)
        with data_lock:
            if self.phase != "QUESTION" or self.q_global != q_num or uid not in self.players or uid in self.answers:
                return
            qid = self.player_qids.get(uid)
            q = self.questions_by_id.get(qid)
            if not q:
                return
            bot = self.players[uid]
            skill = bot.get("botSkill", 0.72)
            # Optionally use a card
            card = None
            if self.settings.get("cards", True) and bot["cards"] and random.random() < 0.25:
                avail = [c for c in bot["cards"] if c in ("double", "shield", "heal")]
                if avail:
                    card = random.choice(avail)
                    bot["cards"].remove(card)
            place = self._make_bot_place(q, skill)
            self.answers[uid] = {
                "qid": qid,
                "place": place,
                "card": card,
                "sentAt": self.now_ms(),
                "frozenMs": 0,
                "retries": 0,
            }
            self._check_all_answered()
            self.bump()

    def _make_bot_place(self, q: dict, skill: float) -> dict:
        good = random.random() < skill
        is_multi = bool(q.get("k") == "ws" or str(q.get("k", "")).startswith("b"))
        views = ["A", "B"] if is_multi else ["all"]
        place = {}
        for v in views:
            ex = q["ex"] if isinstance(q["ex"], list) else q["ex"].get(v, [])
            p0 = {}
            for fk, ang in ex:
                if good:
                    p0[fk] = ang
                else:
                    r = random.random()
                    if r < 0.35 and fk == "N" and q.get("ia"):
                        p0[fk] = 90
                    elif r < 0.35 and ("sin" in fk or "cos" in fk):
                        sw = fk.replace("sin", "cos") if "sin" in fk else fk.replace("cos", "sin")
                        p0[sw] = ang
                    elif r < 0.65:
                        continue
                    else:
                        p0[fk] = (ang + random.choice([30, -30, 180])) % 360
            place[v] = p0
        return place

    def _effective_question_end_ms(self):
        end_ms = self.phase_ends_at
        for uid, p in self.players.items():
            if uid not in self.answers:
                f_end = p.get("freezeEndsAt", 0)
                if f_end > end_ms:
                    end_ms = f_end
        return end_ms

    def _check_all_answered(self):
        st = self.active_stage()
        if st.get("mode", "sync") != "sync":
            return  # Random mode waits for timer as requested
        if len(self.players) > 0 and len(self.answers) >= len(self.players):
            self.finish_question_and_reveal()

    def finish_question_and_reveal(self):
        if self.phase != "QUESTION":
            return
        st = self.active_stage()
        base_dmg = int(st.get("baseDmg", 100))
        q_dur_ms = max(1000.0, self.phase_ends_at - self.phase_started_at)

        # Count team heal cards from players who got acc == 1
        prelim = {}
        heal_count = 0
        for uid, p in self.players.items():
            qid = self.player_qids.get(uid)
            q = self.questions_by_id.get(qid)
            ans = self.answers.get(uid)
            if not q or not ans:
                graded = {"acc": 0.0, "outcome": "wrong", "codes": [], "rows": [], "wrongItems": [], "timedOut": True}
            else:
                graded = grade_answer(q, ans.get("place"))
                graded["timedOut"] = False
            prelim[uid] = (q, ans, graded)
            if ans and ans.get("card") == "heal" and graded["acc"] >= 0.5:
                heal_count += 1

        self.heal_bonus_pct = min(25, heal_count * 5)
        priest_correct = sum(1 for uid, (q, ans, g) in prelim.items() if self.players[uid]["job"] == "priest" and g["acc"] >= 0.999)
        priest_aura = min(0.20, priest_correct * 0.02)

        total_room_dmg = 0
        correct_list = []
        wrong_list = []

        for uid, (q, ans, g) in prelim.items():
            p = self.players[uid]
            acc = g["acc"]
            card = ans.get("card") if ans else None

            # Update streak & job passive
            if acc >= 0.999:
                p["streak"] += 1
            else:
                if card == "shield" or (p["job"] == "knight" and not p.get("knightShieldUsedStage")):
                    if p["job"] == "knight" and not p.get("knightShieldUsedStage"):
                        p["knightShieldUsedStage"] = True
                        g["shieldSaved"] = True
                    else:
                        g["shieldSaved"] = True
                else:
                    p["streak"] = 0

            # Speed multiplier
            if ans and acc >= 0.5:
                q_tm_ms = float(q.get("tm", 25)) * 1000.0
                elapsed = max(0.0, ans["sentAt"] - self.phase_started_at - ans.get("frozenMs", 0))
                rem_ratio = max(0.0, min(1.0, (q_tm_ms - elapsed) / max(1000.0, q_tm_ms)))
                max_spd = 0.6 if p["job"] == "archer" else 0.5
                s_speed = 1.0 + max_spd * rem_ratio
            else:
                s_speed = 1.0

            # Streak multiplier
            sk = p["streak"]
            m_streak = 1.20 if sk >= 5 else (1.10 if sk >= 3 else (1.05 if sk >= 2 else 1.0))

            # Job multiplier
            m_class = 1.15 if (p["job"] == "warrior" and sk >= 3) else 1.0
            m_team = 1.0 + priest_aura + (self.heal_bonus_pct / 100.0)

            # Card multiplier & penalty
            m_card = 1.0
            dmg = 0
            if card == "double":
                if acc >= 0.999:
                    m_card = 2.0
                    dmg = round(base_dmg * acc * s_speed * m_class * m_card * m_streak * m_team)
                elif g.get("shieldSaved"):
                    dmg = 0
                else:
                    dmg = -round(base_dmg * 0.5)
            else:
                if card == "magnifier":
                    m_card = 0.85
                elif card == "second_chance" and ans and ans.get("retries", 0) > 0:
                    m_card = 0.70
                if acc >= 0.5:
                    dmg = round(base_dmg * acc * s_speed * m_class * m_card * m_streak * m_team)

            p["dmg"] += dmg
            p["lastDmg"] = dmg
            p["lastCard"] = card
            p["lastOutcome"] = "shielded" if (acc < 0.5 and g.get("shieldSaved")) else g["outcome"]
            p["accSum"] += acc
            p["qCount"] += 1
            if ans:
                p["timeSum"] += max(0.0, (ans["sentAt"] - self.phase_started_at) / 1000.0)
            else:
                p["timeSum"] += q_dur_ms / 1000.0

            # Topic & Mistake tracking
            topic = q.get("topic", "general")
            ts = p["topicStats"].setdefault(topic, {"ok": 0, "total": 0})
            ts["total"] += 1
            if acc >= 0.999:
                ts["ok"] += 1

            for code in g["codes"]:
                p["mistakes"][code] = p["mistakes"].get(code, 0) + 1

            # Streak card reward: every 3-streak gives +1 card (max 3)
            card_earned = None
            if p["streak"] > 0 and p["streak"] % 3 == 0 and len(p["cards"]) < 3:
                card_earned = random.choice(ALL_CARDS)
                p["cards"].append(card_earned)

            if dmg > 0:
                total_room_dmg += dmg

            sent_ms = (ans["sentAt"] - self.phase_started_at) if ans else 999999
            if acc >= 0.999:
                correct_list.append((sent_ms, uid))
            else:
                wrong_list.append((acc, uid))

            self.results[uid] = {
                "qid": qid,
                "acc": acc,
                "dmg": dmg,
                "outcome": p["lastOutcome"],
                "codes": g["codes"],
                "rows": g["rows"],
                "why": q.get("why", ""),
                "card": card,
                "cardEarned": card_earned,
                "timedOut": g["timedOut"],
                "place": ans.get("place", {}) if ans else {},
                "questionFull": q,
            }

        self.last_room_dmg = total_room_dmg
        self.monster["hp"] = max(0, self.monster["hp"] - total_room_dmg)
        self.update_boss_phase_img()

        # Select 5 battle actors: top 3 fastest 100%-correct + 2 wrong (fill rules)
        correct_list.sort(key=lambda x: x[0])
        random.shuffle(wrong_list)
        c_uids = [u for _, u in correct_list]
        w_uids = [u for _, u in wrong_list]

        picked = []
        picked.extend(c_uids[:3])
        picked.extend(w_uids[:2])
        if len(picked) < 5:
            # Fill from remaining correct first, then remaining wrong
            for u in c_uids[3:]:
                if len(picked) < 5 and u not in picked:
                    picked.append(u)
            for u in w_uids[2:]:
                if len(picked) < 5 and u not in picked:
                    picked.append(u)

        self.battle_actors = []
        for uid in picked:
            p = self.players[uid]
            res = self.results[uid]
            is_wrong = res["acc"] < 0.999
            hide_wrong = bool(self.settings.get("hideWrongNames", True)) and is_wrong
            self.battle_actors.append({
                "uid": uid,
                "name": "นักรบนิรนาม" if hide_wrong else p["name"],
                "masked": hide_wrong,
                "look": p["look"],
                "job": p["job"],
                "outcome": res["outcome"],
                "dmg": res["dmg"],
                "card": res["card"],
            })

        # Compute room reveal stats for Host
        self.room_stats = self._build_room_stats()

        rev_dur = float(self.settings.get("revealSeconds", 10))
        if not self.settings.get("revealAuto", True):
            self.set_phase("REVEAL", 0)
            self.hold_explain = True
        else:
            self.set_phase("REVEAL", rev_dur)

    def _build_room_stats(self):
        st = self.active_stage()
        mode = st.get("mode", "sync")
        total = max(1, len(self.players))
        correct_n = sum(1 for r in self.results.values() if r["acc"] >= 0.999)
        partial_n = sum(1 for r in self.results.values() if 0.5 <= r["acc"] < 0.999)
        wrong_n = total - correct_n - partial_n

        code_counts = {}
        for r in self.results.values():
            for c in r["codes"]:
                code_counts[c] = code_counts.get(c, 0) + 1
        top_mistakes = sorted(code_counts.items(), key=lambda x: -x[1])[:3]
        top_mistakes_fmt = [
            {"code": c, "count": cnt, "pct": round(100 * cnt / total), "label": MISTAKE_META.get(c, {}).get("label", c)}
            for c, cnt in top_mistakes
        ]

        overlay = []
        force_stats = []
        sync_q = self.questions_by_id.get(self.current_sync_qid) if mode == "sync" else None
        if sync_q and sync_q.get("type") in ("A", "B", "C", "D"):
            is_multi = bool(sync_q.get("k") == "ws" or str(sync_q.get("k", "")).startswith("b"))
            focus_v = "A" if is_multi else "all"
            ex_list = sync_q["ex"] if isinstance(sync_q["ex"], list) else sync_q["ex"].get(focus_v, [])
            tol = float(sync_q.get("tol", 15 if is_multi else 12))

            for fk, ang in ex_list:
                ok_c = 0
                dir_c = 0
                miss_c = 0
                for uid, r in self.results.items():
                    p0 = (r.get("place") or {}).get(focus_v) or {}
                    angs = _to_ang_list(p0.get(fk))
                    if not angs:
                        miss_c += 1
                    else:
                        for raw_a in angs:
                            overlay.append({"force": fk, "angle": float(raw_a)})
                        if any(ok_angle(float(a), float(ang), tol) for a in angs):
                            ok_c += 1
                        else:
                            dir_c += 1
                force_stats.append({
                    "force": fk,
                    "okPct": round(100 * ok_c / total),
                    "dirPct": round(100 * dir_c / total),
                    "missPct": round(100 * miss_c / total),
                })

        return {
            "mode": mode,
            "total": total,
            "correct": correct_n,
            "partial": partial_n,
            "wrong": wrong_n,
            "roomDmg": self.last_room_dmg,
            "topMistakes": top_mistakes_fmt,
            "overlay": overlay[:120],
            "forceStats": force_stats,
            "question": sync_q,
        }

    def advance_next(self):
        """Advance to the next logical phase (called by timer or teacher Next)."""
        if self.phase == "LOBBY":
            self.start_game()
        elif self.phase == "INTRO":
            self.set_phase("ENCOUNTER", 4.0)
        elif self.phase == "ENCOUNTER":
            self.start_question_round()
        elif self.phase == "QUESTION":
            self.finish_question_and_reveal()
        elif self.phase == "REVEAL":
            self.set_phase("BATTLE", 5.5)
        elif self.phase == "BATTLE":
            self.set_phase("LEADERBOARD", 5.5)
        elif self.phase == "LEADERBOARD":
            st = self.active_stage()
            if self.monster["hp"] <= 0:
                if self.monster["isBoss"]:
                    self._enter_victory()
                else:
                    # Remaining questions bonus if killed early!
                    rem_q = max(0, st.get("count", 2) - self.q_in_stage)
                    if rem_q > 0:
                        self.bonus_boss_dmg += rem_q * int(st.get("baseDmg", 100)) * max(1, len(self.players)) // 3
                    self._reward_stage_clear()
                    self.set_phase("MON_DEFEAT", 5.0)
            elif self.q_in_stage >= int(st.get("count", 2)):
                if self.monster["isBoss"]:
                    self._enter_defeat()
                else:
                    self.boss_hp_bonus += 0.05
                    self.set_phase("MON_ESCAPE", 4.5)
            else:
                self.start_question_round()
        elif self.phase in ("MON_DEFEAT", "MON_ESCAPE"):
            if self.stage_idx + 1 < len(self.stages):
                self.stage_idx += 1
                self.init_stage_monster()
                for p in self.players.values():
                    p["knightShieldUsedStage"] = False
                self.set_phase("ENCOUNTER", 4.5)
            else:
                self._enter_victory()
        elif self.phase in ("VICTORY", "DEFEAT"):
            self.set_phase("FINAL_BOARD", 0)
        elif self.phase == "FINAL_BOARD":
            self.set_phase("MISTAKE_REPORT", 0)

    def _reward_stage_clear(self):
        for uid, p in self.players.items():
            if p["dmg"] > 0 and len(p["cards"]) < 3:
                p["cards"].append(random.choice(ALL_CARDS))
                if p["job"] == "mage" and len(p["cards"]) < 3:
                    p["cards"].append(random.choice(ALL_CARDS))

    def _enter_victory(self):
        sorted_p = sorted(self.players.values(), key=lambda p: (-p["dmg"], -p["accSum"], p["timeSum"]))
        self.cutscene_cast = [p["uid"] for p in sorted_p[:5]]
        self.set_phase("VICTORY", 8.0)

    def _enter_defeat(self):
        uids = list(self.players.keys())
        random.shuffle(uids)
        self.cutscene_cast = uids[:5]
        self.defeat_fate = random.choice(["eat", "burn"])
        self.set_phase("DEFEAT", 8.0)

    def start_game(self):
        if self.phase != "LOBBY":
            return
        self.stage_idx = 0
        self.q_global = 0
        self.used_qids = set()
        self.boss_hp_bonus = 0.0
        self.bonus_boss_dmg = 0
        self.init_stage_monster()
        uids = list(self.players.keys())
        random.shuffle(uids)
        self.cutscene_cast = uids[:5]
        self.set_phase("INTRO", 7.5)

    def retry_boss(self):
        # Jump directly back to Dragon boss stage with fresh HP
        boss_idx = next((idx for idx, s in enumerate(self.stages) if s.get("isBoss")), len(self.stages) - 1)
        self.stage_idx = boss_idx
        self.init_stage_monster()
        for p in self.players.values():
            p["knightShieldUsedStage"] = False
        self.set_phase("ENCOUNTER", 4.5)

    def leaderboard_list(self):
        arr = sorted(self.players.values(), key=lambda p: (-p["dmg"], -p["accSum"], p["timeSum"]))
        out = []
        for idx, p in enumerate(arr):
            rank = idx + 1
            prev_r = self.prev_ranks.get(p["uid"], rank)
            out.append({
                "rank": rank,
                "delta": prev_r - rank,
                "uid": p["uid"],
                "name": p["name"],
                "job": p["job"],
                "look": p["look"],
                "dmg": p["dmg"],
                "lastDmg": p.get("lastDmg", 0),
                "lastCard": p.get("lastCard"),
                "streak": p["streak"],
                "isBot": p.get("isBot", False),
            })
        return out

    def class_mistake_report(self):
        total_p = max(1, len(self.players))
        agg = {}
        for p in self.players.values():
            for code, cnt in p["mistakes"].items():
                entry = agg.setdefault(code, {"code": code, "totalCount": 0, "playersAffected": 0})
                entry["totalCount"] += cnt
                entry["playersAffected"] += 1
        items = sorted(agg.values(), key=lambda x: -x["totalCount"])
        for it in items:
            meta = MISTAKE_META.get(it["code"], {"label": it["code"], "tip": ""})
            it["label"] = meta["label"]
            it["tip"] = meta["tip"]
            it["pctPlayers"] = round(100 * it["playersAffected"] / total_p)
        return items

    def player_mistake_report(self, uid: str):
        p = self.players.get(uid)
        if not p:
            return {}
        items = sorted(p["mistakes"].items(), key=lambda x: -x[1])
        top = []
        for code, cnt in items[:5]:
            meta = MISTAKE_META.get(code, {"label": code, "tip": ""})
            top.append({"code": code, "count": cnt, "label": meta["label"], "tip": meta["tip"]})
        topics = []
        for tp, st in p["topicStats"].items():
            topics.append({"topic": tp, "ok": st["ok"], "total": st["total"], "pct": round(100 * st["ok"] / max(1, st["total"]))})
        return {
            "topMistakes": top,
            "topics": topics,
            "totalQ": p["qCount"],
            "avgAcc": round(100 * p["accSum"] / max(1, p["qCount"])),
            "totalDmg": p["dmg"],
        }

    def build_view(self, role: str, uid: str = None) -> dict:
        now = self.now_ms()
        base = {
            "pin": self.pin,
            "version": self.version,
            "serverNow": now,
            "phase": self.phase,
            "paused": self.paused,
            "holdExplain": self.hold_explain,
            "phaseStartedAt": self.phase_started_at,
            "phaseEndsAt": self.phase_ends_at,
            "stageIdx": self.stage_idx,
            "stageTotal": len(self.stages),
            "qInStage": self.q_in_stage,
            "qGlobal": self.q_global,
            "monster": self.monster,
            "playerCount": len(self.players),
            "answeredCount": len(self.answers),
            "settings": self.settings,
            "healBonusPct": self.heal_bonus_pct,
        }

        if role == "host":
            cast_players = [
                {
                    "uid": u,
                    "name": self.players[u]["name"],
                    "look": self.players[u]["look"],
                    "job": self.players[u]["job"],
                }
                for u in self.cutscene_cast if u in self.players
            ]
            roster = [
                {"uid": p["uid"], "name": p["name"], "look": p["look"], "job": p["job"], "isBot": p.get("isBot", False)}
                for p in self.players.values()
            ]
            base["roster"] = roster
            base["cutsceneCast"] = cast_players
            base["battleActors"] = self.battle_actors
            base["defeatFate"] = self.defeat_fate
            base["leaderboard"] = self.leaderboard_list()
            if self.phase == "QUESTION":
                st = self.active_stage()
                base["questionMode"] = st.get("mode", "sync")
                if st.get("mode", "sync") == "sync" and self.current_sync_qid:
                    base["question"] = sanitize_question_for_player(self.questions_by_id[self.current_sync_qid])
            elif self.phase == "REVEAL":
                base["roomStats"] = self.room_stats
            elif self.phase in ("FINAL_BOARD", "MISTAKE_REPORT"):
                base["classMistakes"] = self.class_mistake_report()
        else:
            p = self.players.get(uid)
            if p:
                lb = self.leaderboard_list()
                my_rank = next((item["rank"] for item in lb if item["uid"] == uid), len(lb))
                above = next((item for item in lb if item["rank"] == my_rank - 1), None)
                base["me"] = {
                    "uid": p["uid"],
                    "name": p["name"],
                    "look": p["look"],
                    "job": p["job"],
                    "dmg": p["dmg"],
                    "streak": p["streak"],
                    "cards": p["cards"],
                    "rank": my_rank,
                    "gapAbove": max(0, above["dmg"] - p["dmg"]) if above else 0,
                    "answered": uid in self.answers,
                    "freezeEndsAt": p.get("freezeEndsAt", 0),
                    "lastOutcome": p.get("lastOutcome", "correct"),
                    "lastDmg": p.get("lastDmg", 0),
                    "lastCard": p.get("lastCard"),
                }
                if self.phase == "QUESTION":
                    qid = self.player_qids.get(uid)
                    if qid and qid in self.questions_by_id:
                        base["question"] = sanitize_question_for_player(self.questions_by_id[qid])
                    ans = self.answers.get(uid)
                    if ans:
                        base["myCard"] = ans.get("card")
                elif self.phase == "REVEAL":
                    base["myResult"] = self.results.get(uid)
                elif self.phase in ("VICTORY", "DEFEAT"):
                    base["defeatFate"] = self.defeat_fate
                elif self.phase in ("FINAL_BOARD", "MISTAKE_REPORT"):
                    base["myReport"] = self.player_mistake_report(uid)
                    base["top3"] = lb[:3]
            else:
                base["kicked"] = True
        return base


ROOMS: dict[str, GameRoom] = {}


def tick_rooms_loop():
    while True:
        time.sleep(0.2)
        with data_lock:
            now = time.time() * 1000
            for room in list(ROOMS.values()):
                if room.paused or room.hold_explain:
                    continue
                if room.phase == "QUESTION":
                    eff_end = room._effective_question_end_ms()
                    if eff_end > 0 and now >= eff_end:
                        room.finish_question_and_reveal()
                        room.bump()
                elif room.phase in ("INTRO", "ENCOUNTER", "REVEAL", "BATTLE", "LEADERBOARD", "MON_DEFEAT", "MON_ESCAPE", "VICTORY", "DEFEAT"):
                    if room.phase_ends_at > 0 and now >= room.phase_ends_at:
                        room.advance_next()
                        room.bump()


class DragonHeroHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        pass  # Keep console clean

    def _send_json(self, code: int, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def _serve_file(self, rel_path: str):
        safe = rel_path.lstrip("/").split("?")[0]
        routes = {
            "": "index.html",
            "host": "host.html",
            "play": "play.html",
            "editor": "editor.html",
        }
        safe = routes.get(safe, safe)
        target = (PUBLIC_DIR / safe).resolve()
        if not str(target).startswith(str(PUBLIC_DIR.resolve())) or not target.is_file():
            self.send_error(404, "Not found")
            return
        ctype, _ = mimetypes.guess_type(str(target))
        if not ctype:
            ctype = "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype + ("; charset=utf-8" if ctype.startswith("text/") or "javascript" in ctype else ""))
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/api/server-info":
            self._send_json(200, {"ip": get_lan_ip(), "port": PORT})
            return

        if path == "/api/questions":
            with data_lock:
                self._send_json(200, load_json(QUESTIONS_FILE, []))
            return

        if path == "/api/quests":
            with data_lock:
                self._send_json(200, load_json(QUESTS_FILE, []))
            return

        if path.startswith("/api/room/") and path.endswith("/stream"):
            parts = path.split("/")
            pin = parts[3] if len(parts) > 3 else ""
            role = qs.get("role", ["player"])[0]
            uid = qs.get("uid", [None])[0]

            with data_lock:
                room = ROOMS.get(pin)
                if not room:
                    self._send_json(404, {"error": "ไม่พบห้องนี้"})
                    return
                q = queue.Queue(maxsize=32)
                client = (q, role, uid)
                room.sse_clients.append(client)
                initial = room.build_view(role, uid)

            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()

            try:
                self.wfile.write(f"data: {json.dumps(initial, ensure_ascii=False)}\n\n".encode("utf-8"))
                self.wfile.flush()
                while True:
                    try:
                        payload = q.get(timeout=15)
                        self.wfile.write(f"data: {json.dumps(payload, ensure_ascii=False)}\n\n".encode("utf-8"))
                        self.wfile.flush()
                    except queue.Empty:
                        self.wfile.write(b": ping\n\n")
                        self.wfile.flush()
            except Exception:
                pass
            finally:
                with data_lock:
                    if client in room.sse_clients:
                        room.sse_clients.remove(client)
            return

        if path.startswith("/api/room/") and path.endswith("/state"):
            parts = path.split("/")
            pin = parts[3]
            role = qs.get("role", ["player"])[0]
            uid = qs.get("uid", [None])[0]
            with data_lock:
                room = ROOMS.get(pin)
                if not room:
                    self._send_json(404, {"error": "ไม่พบห้องนี้"})
                    return
                self._send_json(200, room.build_view(role, uid))
            return

        if path.startswith("/api/room/") and path.endswith("/csv"):
            parts = path.split("/")
            pin = parts[3]
            with data_lock:
                room = ROOMS.get(pin)
                if not room:
                    self.send_error(404)
                    return
                lines = ["Rank,Name,Job,Damage,AvgAccuracyPct,Mistakes"]
                for item in room.leaderboard_list():
                    p = room.players.get(item["uid"], {})
                    avg = round(100 * p.get("accSum", 0) / max(1, p.get("qCount", 1)))
                    mks = ";".join(f"{k}:{v}" for k, v in p.get("mistakes", {}).items())
                    lines.append(f'{item["rank"]},"{item["name"]}",{item["job"]},{item["dmg"]},{avg},"{mks}"')
                csv_bytes = ("\ufeff" + "\n".join(lines)).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", f'attachment; filename="dragon_hero_{pin}.csv"')
            self.send_header("Content-Length", str(len(csv_bytes)))
            self.end_headers()
            self.wfile.write(csv_bytes)
            return

        self._serve_file(path)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        try:
            body = self._read_json()
        except Exception:
            self._send_json(400, {"error": "Invalid JSON"})
            return

        # --- Editor APIs ---
        if path == "/api/questions":
            with data_lock:
                qs = load_json(QUESTIONS_FILE, [])
                qid = body.get("id") or f"custom_{secrets.token_hex(4)}"
                body["id"] = qid
                idx = next((i for i, q in enumerate(qs) if q["id"] == qid), None)
                if idx is not None:
                    qs[idx] = body
                else:
                    qs.append(body)
                save_json(QUESTIONS_FILE, qs)
            self._send_json(200, {"ok": True, "question": body})
            return

        if path == "/api/questions/delete":
            qid = body.get("id")
            with data_lock:
                qs = [q for q in load_json(QUESTIONS_FILE, []) if q["id"] != qid]
                save_json(QUESTIONS_FILE, qs)
            self._send_json(200, {"ok": True})
            return

        if path == "/api/quests":
            with data_lock:
                quests = load_json(QUESTS_FILE, [])
                kid = body.get("id") or f"quest_{secrets.token_hex(4)}"
                body["id"] = kid
                idx = next((i for i, k in enumerate(quests) if k["id"] == kid), None)
                if idx is not None:
                    quests[idx] = body
                else:
                    quests.append(body)
                save_json(QUESTS_FILE, quests)
            self._send_json(200, {"ok": True, "quest": body})
            return

        if path == "/api/grade-preview":
            res = grade_answer(body.get("question", {}), body.get("place", {}))
            self._send_json(200, res)
            return

        if path == "/api/upload-image":
            import base64
            data_url = body.get("dataUrl", "")
            if "," not in data_url:
                self._send_json(400, {"error": "Bad image"})
                return
            header, b64 = data_url.split(",", 1)
            ext = "png" if "png" in header else ("jpg" if "jpeg" in header or "jpg" in header else "webp")
            fname = f"img_{secrets.token_hex(6)}.{ext}"
            CUSTOM_ASSETS_DIR.mkdir(parents=True, exist_ok=True)
            (CUSTOM_ASSETS_DIR / fname).write_bytes(base64.b64decode(b64))
            self._send_json(200, {"url": f"/assets/custom/{fname}"})
            return

        # --- Room Creation & Join ---
        if path == "/api/room/create":
            with data_lock:
                quests = load_json(QUESTS_FILE, [])
                questions = load_json(QUESTIONS_FILE, [])
                q_map = {q["id"]: q for q in questions}
                quest_id = body.get("questId")
                quest = next((k for k in quests if k["id"] == quest_id), quests[0])
                while True:
                    pin = f"{random.randint(100000, 999999)}"
                    if pin not in ROOMS:
                        break
                room = GameRoom(pin, quest, q_map)
                ROOMS[pin] = room
                self._send_json(200, {"pin": pin, "hostToken": room.host_token, "state": room.build_view("host")})
            return

        if path == "/api/room/join":
            pin = str(body.get("pin", "")).strip()
            with data_lock:
                room = ROOMS.get(pin)
                if not room:
                    self._send_json(404, {"error": "ไม่พบห้อง PIN นี้"})
                    return
                uid = body.get("uid") or f"p_{secrets.token_hex(6)}"
                if uid in room.players:
                    p = room.players[uid]
                    if body.get("name"):
                        p["name"] = sanitize_name(body.get("name"))
                    if body.get("look"):
                        p["look"] = body.get("look")
                    if body.get("job"):
                        p["job"] = body.get("job")
                else:
                    name = sanitize_name(body.get("name"))
                    existing_names = {x["name"] for x in room.players.values()}
                    if name in existing_names:
                        name = f"{name}#{random.randint(10, 99)}"
                    job = body.get("job", "warrior")
                    if job not in JOB_START_CARD:
                        job = "warrior"
                    start_card = JOB_START_CARD[job]
                    extra_card = random.choice([c for c in ALL_CARDS if c != start_card])
                    room.players[uid] = {
                        "uid": uid,
                        "name": name,
                        "look": body.get("look", {"skin": 0, "hair": 0, "hairColor": 0, "outfit": 0, "hat": 0}),
                        "job": job,
                        "dmg": 0,
                        "streak": 0,
                        "cards": [start_card, extra_card],
                        "mistakes": {},
                        "topicStats": {},
                        "accSum": 0.0,
                        "qCount": 0,
                        "timeSum": 0.0,
                        "isBot": False,
                        "knightShieldUsedStage": False,
                    }
                room.bump()
                self._send_json(200, {"uid": uid, "state": room.build_view("player", uid)})
            return

        # --- Room Actions ---
        parts = path.split("/")
        if len(parts) >= 5 and parts[1] == "api" and parts[2] == "room":
            pin = parts[3]
            action = parts[4]
            with data_lock:
                room = ROOMS.get(pin)
                if not room:
                    self._send_json(404, {"error": "ไม่พบห้องนี้"})
                    return

                if action == "bots":
                    bot_specs = [
                        ("ก้องเกียรติ", "warrior", {"skin": 0, "hair": 1, "hairColor": 0, "outfit": 0, "hat": 0}, 0.88),
                        ("เอมมี่", "archer", {"skin": 1, "hair": 3, "hairColor": 2, "outfit": 2, "hat": 1}, 0.82),
                        ("เมฆา", "mage", {"skin": 0, "hair": 2, "hairColor": 4, "outfit": 3, "hat": 2}, 0.78),
                        ("ปั้นหยา", "knight", {"skin": 2, "hair": 0, "hairColor": 1, "outfit": 1, "hat": 3}, 0.55),
                        ("ต้นกล้า", "priest", {"skin": 1, "hair": 4, "hairColor": 5, "outfit": 4, "hat": 4}, 0.45),
                    ]
                    for bname, bjob, blook, bskill in bot_specs:
                        buid = f"bot_{secrets.token_hex(4)}"
                        sc = JOB_START_CARD[bjob]
                        room.players[buid] = {
                            "uid": buid, "name": bname, "look": blook, "job": bjob,
                            "dmg": 0, "streak": 0, "cards": [sc, random.choice(ALL_CARDS)],
                            "mistakes": {}, "topicStats": {}, "accSum": 0.0, "qCount": 0, "timeSum": 0.0,
                            "isBot": True, "botSkill": bskill, "knightShieldUsedStage": False,
                        }
                    room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "start":
                    room.start_game()
                    room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "next":
                    room.advance_next()
                    room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "hold":
                    if room.phase == "REVEAL":
                        room.hold_explain = not room.hold_explain
                        if not room.hold_explain:
                            room.phase_ends_at = room.now_ms() + float(room.settings.get("revealSeconds", 10)) * 1000
                        room.bump()
                    self._send_json(200, {"ok": True, "holdExplain": room.hold_explain})
                    return

                if action == "pause":
                    room.paused = not room.paused
                    if room.paused:
                        room.pause_remaining_ms = max(0, room.phase_ends_at - room.now_ms())
                    else:
                        if room.pause_remaining_ms > 0:
                            room.phase_ends_at = room.now_ms() + room.pause_remaining_ms
                    room.bump()
                    self._send_json(200, {"ok": True, "paused": room.paused})
                    return

                if action == "add-time":
                    sec = float(body.get("seconds", 15))
                    if room.phase_ends_at > 0:
                        room.phase_ends_at += sec * 1000
                        room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "kick":
                    kuid = body.get("uid")
                    if kuid in room.players:
                        del room.players[kuid]
                        room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "settings":
                    for k, v in body.items():
                        if k == "stageMode" and isinstance(v, dict):
                            idx = v.get("stageIdx", room.stage_idx)
                            if 0 <= idx < len(room.stages):
                                room.stages[idx]["mode"] = v.get("mode", "sync")
                        else:
                            room.settings[k] = v
                    room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "end-early":
                    room.set_phase("FINAL_BOARD", 0)
                    room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "retry-boss":
                    room.retry_boss()
                    room.bump()
                    self._send_json(200, {"ok": True})
                    return

                if action == "card":
                    uid = body.get("uid")
                    card = body.get("card")
                    p = room.players.get(uid)
                    if not p or room.phase != "QUESTION" or uid in room.answers or not room.settings.get("cards", True):
                        self._send_json(400, {"error": "ไม่สามารถใช้การ์ดได้ในขณะนี้"})
                        return
                    if card not in p["cards"]:
                        self._send_json(400, {"error": "ไม่มีการ์ดนี้"})
                        return
                    p["cards"].remove(card)
                    extra = {}
                    if card == "freeze":
                        p["freezeEndsAt"] = max(room.phase_ends_at, room.now_ms()) + 10000
                        p["usedFreezeMs"] = 10000
                        extra["freezeEndsAt"] = p["freezeEndsAt"]
                    elif card == "magnifier":
                        qid = room.player_qids.get(uid)
                        q = room.questions_by_id.get(qid, {})
                        if isinstance(q.get("ex"), list):
                            cnt = len(q["ex"])
                        else:
                            cnt = sum(len((q.get("ex") or {}).get(k, [])) for k in ("A", "B"))
                        extra["forceCount"] = cnt
                    p["armedCard"] = card
                    room.bump()
                    self._send_json(200, {"ok": True, "card": card, **extra})
                    return

                if action == "answer":
                    uid = body.get("uid")
                    p = room.players.get(uid)
                    if not p or room.phase != "QUESTION":
                        self._send_json(400, {"error": "หมดเวลาส่งคำตอบแล้ว"})
                        return
                    if uid in room.answers:
                        self._send_json(400, {"error": "ส่งคำตอบไปแล้ว"})
                        return

                    qid = room.player_qids.get(uid)
                    q = room.questions_by_id.get(qid)
                    card = p.get("armedCard")
                    place = body.get("place") or {}

                    # Check second_chance card!
                    if card == "second_chance" and not p.get("secondChanceUsed") and q:
                        preview = grade_answer(q, place)
                        if preview["acc"] < 0.999:
                            p["secondChanceUsed"] = True
                            p["secondChanceRetries"] = 1
                            self._send_json(200, {
                                "ok": True,
                                "retry": True,
                                "wrongItems": preview["wrongItems"],
                                "msg": "โอกาสที่สอง! มีจุดที่ยังไม่ถูก — แก้ไขแล้วส่งอีกครั้งได้เลย",
                            })
                            return

                    room.answers[uid] = {
                        "qid": qid,
                        "place": place,
                        "card": card,
                        "sentAt": room.now_ms(),
                        "frozenMs": p.pop("usedFreezeMs", 0),
                        "retries": p.pop("secondChanceRetries", 0),
                    }
                    p.pop("armedCard", None)
                    p.pop("secondChanceUsed", None)
                    p.pop("freezeEndsAt", None)
                    room._check_all_answered()
                    room.bump()
                    self._send_json(200, {"ok": True, "retry": False})
                    return

        self._send_json(404, {"error": "Unknown endpoint"})


class ReusableThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    t = threading.Thread(target=tick_rooms_loop, daemon=True)
    t.start()
    lan_ip = get_lan_ip()
    srv = ReusableThreadingServer(("0.0.0.0", PORT), DragonHeroHandler)
    print("===================================================")
    print("  Dragon Hero: FBD Quest Classroom Server")
    print(f"  Host (Teacher): http://localhost:{PORT}/host")
    print(f"  Join (LAN):     http://{lan_ip}:{PORT}/play")
    print(f"  Editor:         http://localhost:{PORT}/editor")
    print("===================================================")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()
