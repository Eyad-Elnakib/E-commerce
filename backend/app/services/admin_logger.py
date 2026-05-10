import os
import json
from datetime import datetime, timezone
from pathlib import Path

LOGS_DIR = Path(__file__).parent.parent.parent / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
ADMIN_LOG_FILE = LOGS_DIR / "admin.log"

def log_admin_action(admin_username: str, action: str, target_id: str, diff: dict = None):
    """
    Log an admin mutation to logs/admin.log.
    Format: {ts} {admin_username} action=<action> target_id=<id> diff=<json>
    """
    ts = datetime.now(timezone.utc).isoformat()
    diff_str = json.dumps(diff) if diff else "{}"
    
    log_line = f"{ts} {admin_username} action={action} target_id={target_id} diff={diff_str}\n"
    
    with open(ADMIN_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_line)
