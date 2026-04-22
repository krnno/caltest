// ===== 設定 =====
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwDmbS1gNoPLNwKH4oaTVgblGDhArpXY45yeToAJJ5-7eLXeryYhhx7vPdpCR1Xlp7W/exec",

  FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLScObVveP12M1sgxrOUMGTvADFIltmlkCXci1WGT6StPgmYWdg/viewform",

  FORM_PARAMS: {
    date: "entry.1234567890",
    time: "entry.0987654321"
  }
};

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', init);

function init() {
  const calendarEl = document.getElementById('calendar');
  const loadingEl  = document.getElementById('loading');

  const calendar = new FullCalendar.Calendar(calendarEl, {

    initialView: isMobile() ? 'timeGridDay' : 'dayGridMonth',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },

    height: 'auto',

    nowIndicator: true,

    validRange: {
      start: today()
    },

    loading: function(isLoading) {
      loadingEl.style.display = isLoading ? 'block' : 'none';
    },

    events: fetchEvents,

    eventClick: handleEventClick

  });

  calendar.render();
}

// ===== イベント取得 =====
function fetchEvents(info, success, failure) {

  const start = info.startStr.slice(0,10);
  const end   = info.endStr.slice(0,10);

  fetch(`${CONFIG.API_URL}?start=${start}&end=${end}&t=${Date.now()}`)
    .then(res => res.json())
    .then(data => {

      if (!data.ok) {
        console.error(data.error);
        failure(data.error);
        return;
      }

      const events = data.events.map(ev => ({
        title: '空き',
        start: ev.start,
        end: ev.end,
        color: '#48c774'
      }));

      success(events);
    })
    .catch(err => {
      console.error(err);
      failure(err);
    });
}

// ===== クリック処理 =====
function handleEventClick(info) {

  const start = new Date(info.event.start);

  const date = start.toISOString().slice(0,10);
  const time = start.toTimeString().slice(0,5);

  const url = buildFormUrl(date, time);

  window.open(url, '_blank');
}

// ===== フォームURL生成 =====
function buildFormUrl(date, time) {
  const p = CONFIG.FORM_PARAMS;

  return `${CONFIG.FORM_URL}?${p.date}=${encodeURIComponent(date)}&${p.time}=${encodeURIComponent(time)}`;
}

// ===== ユーティリティ =====
function today() {
  return new Date().toISOString().split('T')[0];
}

function isMobile() {
  return window.innerWidth < 768;
}
