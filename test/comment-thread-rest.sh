#!/usr/bin/env bash
set -e
URL="https://ozykvjuktmfyxdmudooh.supabase.co/rest/v1/comments"
KEY="sb_publishable_Ht9q_kAOXQHPDCjTu_7oqQ_64Jnr2C3"
H=(-H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json")

# 1) 최상위 코멘트(℃±㎛²) INSERT
cat > /tmp/cm_top.json <<'JSON'
{"comment_id":"cm_rest_top","item_id":"it_rest_smoke","comp_id":"c_rest","author_role":"교수","content":"정답 ℃±㎛² 애매","is_resolved":false,"parent_id":null}
JSON
curl -s "${H[@]}" -H "Prefer: return=representation" -X POST "$URL" --data-binary @/tmp/cm_top.json | grep -q '℃±㎛²' && echo "TOP INSERT ok"

# 2) 답글 INSERT (parent_id=cm_rest_top)
cat > /tmp/cm_rep.json <<'JSON'
{"comment_id":"cm_rest_rep","item_id":"it_rest_smoke","comp_id":"c_rest","author_role":"SME","content":"어떤 점이 애매한가요?","is_resolved":false,"parent_id":"cm_rest_top"}
JSON
curl -s "${H[@]}" -X POST "$URL" --data-binary @/tmp/cm_rep.json

# 3) 조회로 parent_id 왕복 확인
curl -s "${H[@]}" "$URL?item_id=eq.it_rest_smoke&select=comment_id,parent_id,content" | grep -q 'cm_rest_top' && echo "ROUNDTRIP ok"

# 4) 클린업(생성분 정확 삭제)
curl -s "${H[@]}" -X DELETE "$URL?item_id=eq.it_rest_smoke"
curl -s "${H[@]}" "$URL?item_id=eq.it_rest_smoke&select=comment_id" | grep -q '\[\]' && echo "CLEANUP ok"
