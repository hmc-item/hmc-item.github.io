#!/usr/bin/env bash
# comp_id=null 문항 왕복(은행) + 특수문자 무손실. publishable 키(사내 무암호 테스트 DB).
set -e
U="https://ozykvjuktmfyxdmudooh.supabase.co"; K="sb_publishable_Ht9q_kAOXQHPDCjTu_7oqQ_64Jnr2C3"
ID="it_banktest_$(date +%s)"
cat > /tmp/bankrow.json <<JSON
{"item_id":"$ID","comp_id":null,"team_id":null,"item_type":"essay","grade":"1급","question":"은행 왕복 ℃±㎛² 시험","model_answer":"모범","explanation":"해설","created_at":"2026-07-09T00:00:00Z","updated_at":"2026-07-09T00:00:00Z"}
JSON
echo "INSERT:"; curl -s -o /dev/null -w "%{http_code}\n" -X POST "$U/rest/v1/items" -H "apikey: $K" -H "Authorization: Bearer $K" -H "Content-Type: application/json" --data-binary @/tmp/bankrow.json
echo "SELECT(comp_id is null):"; curl -s "$U/rest/v1/items?item_id=eq.$ID&select=item_id,comp_id,question" -H "apikey: $K" -H "Authorization: Bearer $K"
echo ""; echo "DELETE:"; curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "$U/rest/v1/items?item_id=eq.$ID" -H "apikey: $K" -H "Authorization: Bearer $K"
