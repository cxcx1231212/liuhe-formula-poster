"""Record completed deployments after both Workers have been published."""

import json

from check_lottery_updates import CATALOG, DEPLOYED_ISSUES


catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
issues = {str(row['lotteryType']): int(row['nextPeriod']) for row in catalog}
DEPLOYED_ISSUES.write_text(json.dumps(issues, sort_keys=True) + '\n', encoding='utf-8')
print(f'Deployed issues: {issues}')
