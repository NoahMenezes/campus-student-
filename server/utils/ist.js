// Timezone helpers: store UTC Date in MongoDB, evaluate and display days/times in Asia/Kolkata (IST)

function getIstNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hourCycle: 'h23',
  }).formatToParts(now);

  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    minutes: Number(map.hour) * 60 + Number(map.minute),
    weekday: map.weekday,
  };
}

function parseMinutes(hhmm) {
  const [hh, mm] = String(hhmm).split(':').map(Number);
  return hh * 60 + mm;
}

module.exports = { getIstNowParts, parseMinutes };
