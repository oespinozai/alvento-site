"""Daily UTC scan. Demo time = fixed example date + elapsed real days + visitor offset."""
import os
import time
from engine import Ledger
ledger = Ledger(os.environ['ARREARS_DB'])
with ledger.db() as db:
    db.execute('DELETE FROM sessions WHERE created<?', (time.time()-86400,))
    tokens = [r[0] for r in db.execute('SELECT token FROM sessions')]
for token in tokens:
    try:
        ledger.run(token)
    except LookupError:
        pass
print(f'Checked {len(tokens)} active mock ledgers.')
