#!/usr/bin/env bash
# theory_sections REST 왕복 스모크. ⚠️ 특수문자(℃±㎛²)는 Git Bash 인라인 -d가 멀티바이트를
# 깨뜨리므로 반드시 파일(--data-binary @)로 전송한다.
URL="https://ozykvjuktmfyxdmudooh.supabase.co/rest/v1"
KEY="sb_publishable_Ht9q_kAOXQHPDCjTu_7oqQ_64Jnr2C3"
H_KEY="apikey: $KEY"; H_AUTH="Authorization: Bearer $KEY"; H_JSON="Content-Type: application/json"
TMP="$(dirname "$0")/.tmp_payload.json"
# 복합 section_key(comp_id::team_id) 왕복 검증
KEYVAL="smoke_comp::smoke_team"
printf '%s' '{"id":"ths_smoke","section_key":"smoke_comp::smoke_team","subject":"기계보전","section_title":"PLC","content":{"t":"℃±㎛² 무손실 테스트"},"status":"draft"}' > "$TMP"
# INSERT
curl -s -o /dev/null -w "INSERT %{http_code}\n" -X POST "$URL/theory_sections" \
  -H "$H_KEY" -H "$H_AUTH" -H "$H_JSON" --data-binary @"$TMP"
# SELECT 무손실 확인(복합키 조회 — :: 는 URL 안전, eq.로 그대로 매칭)
curl -s "$URL/theory_sections?section_key=eq.smoke_comp::smoke_team&select=content" -H "$H_KEY" -H "$H_AUTH"; echo ""
# DELETE 정리
curl -s -o /dev/null -w "DELETE %{http_code}\n" -X DELETE "$URL/theory_sections?section_key=eq.smoke_comp::smoke_team" -H "$H_KEY" -H "$H_AUTH"
rm -f "$TMP"
