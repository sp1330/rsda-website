/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  if (!e.record.get("zoom")) e.record.set("zoom", 1);
  if (!e.record.get("x"))    e.record.set("x", 0);
  if (!e.record.get("y"))    e.record.set("y", 0);
  e.next();
}, "logos");

onRecordUpdateRequest((e) => {
  e.next();
}, "logos");
