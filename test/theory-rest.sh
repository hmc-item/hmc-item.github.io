#!/usr/bin/env bash
URL="https://ozykvjuktmfyxdmudooh.supabase.co/rest/v1"
KEY="sb_publishable_Ht9q_kAOXQHPDCjTu_7oqQ_64Jnr2C3"
H_KEY="apikey: $KEY"; H_AUTH="Authorization: Bearer $KEY"; H_JSON="Content-Type: application/json"
# INSERT (℃±㎛² 무손실)
curl -s -o /dev/null -w "INSERT %{http_code}\n" -X POST "$URL/theory_sections" \
  -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" -H "Prefer: return=minimal" \
  -d '{"id":"ths_smoke","section_key":"smoke","subject":"기계보전","section_title":"PLC","content":{"t":"℃±㎛² 테스트"},"status":"draft"}'
# SELECT 무손실 확인
curl -s "$URL/theory_sections?section_key=eq.smoke&select=content" -H "$H_KEY" -H "$H_AUTH"
echo ""
# DELETE 정리
curl -s -o /dev/null -w "DELETE %{http_code}\n" -X DELETE "$URL/theory_sections?section_key=eq.smoke" -H "$H_KEY" -H "$H_AUTH"
