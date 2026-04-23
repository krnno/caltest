const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwDmbS1gNoPLNwKH4oaTVgblGDhArpXY45yeToAJJ5-7eLXeryYhhx7vPdpCR1Xlp7W/exec"
};

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

    loading: isLoading => {
      loadingEl.style.display = isLoading ? 'block' : 'none';
    },

    events: fetchEvents,

    eventClick: handleEventClick

  });

  calendar.render();
}

// ===== API =====
function fetchEvents(info, success, failure) {

  const start = info.startStr.slice(0,10);
  const end   = info.endStr.slice(0,10);

  fetch(`${CONFIG.API_URL}?start=${start}&end=${end}`)
    .then(res => res.json())
    .then(data => {

      if (!data.ok) {
        failure(data.error);
        return;
      }

      success(data.events.map(ev => ({
        title: '空き',
        start: ev.start,
        end: ev.end,
        color: '#48c774'
      })));
    })
    .catch(failure);
}

// ===== クリック =====
function handleEventClick(info) {
  openBookingModal(
    new Date(info.event.start).toISOString().slice(0,10),
    new Date(info.event.start),
    new Date(info.event.end)
  );
}

// ===== モーダル =====
function openBookingModal(date, openStart, openEnd) {

  const modal = document.createElement('div');
  modal.className = 'modal is-active';

  modal.innerHTML = `
    <div class="modal-background"></div>

    <div class="modal-card">

      <header class="modal-card-head">
        <p class="modal-card-title">予約</p>
        <button class="delete"></button>
      </header>

      <section class="modal-card-body">

        <div class="field">
          <label class="label">日付</label>
          <input class="input" value="${date}" readonly>
        </div>

        <div class="field">
          <label class="label">利用形式</label>
          <label class="radio"><input type="radio" name="type" value="CALL" checked> 通話</label>
          <label class="radio"><input type="radio" name="type" value="MEET"> 対面</label>
        </div>

        <div class="field">
          <label class="label">開始時間</label>
          <div class="select is-fullwidth">
            <select id="startTime"></select>
          </div>
        </div>

        <div class="field">
          <label class="label">利用時間</label>
          <div class="select is-fullwidth">
            <select id="duration"></select>
          </div>
        </div>

        <div id="meetingField" class="field" style="display:none;">
          <label class="label">待ち合わせ場所</label>
          <input id="meeting" class="input">
        </div>

        <div class="field">
          <label class="label">レンタル目的</label>
          <textarea id="purpose" class="textarea"></textarea>
        </div>

      </section>

      <footer class="modal-card-foot">
        <button class="button is-success" id="submitBtn">送信</button>
        <button class="button cancel">キャンセル</button>
      </footer>

    </div>
  `;

  document.getElementById('modal-root').appendChild(modal);

  buildStartOptions(modal, openStart, openEnd);
  updateDuration(modal, 'CALL');

  modal.querySelectorAll('input[name="type"]').forEach(r => {
    r.onchange = () => {
      const type = r.value;
      updateDuration(modal, type);

      modal.querySelector('#meetingField').style.display =
        (type === 'MEET') ? '' : 'none';
    };
  });

  modal.querySelector('.delete').onclick =
  modal.querySelector('.cancel').onclick =
  modal.querySelector('.modal-background').onclick =
    () => modal.remove();

  modal.querySelector('#submitBtn').onclick = () => {

    const data = {
      date,
      type: modal.querySelector('input[name="type"]:checked').value,
      start: modal.querySelector('#startTime').value,
      duration: modal.querySelector('#duration').value,
      meeting: modal.querySelector('#meeting').value,
      purpose: modal.querySelector('#purpose').value
    };

    console.log(data); // GAS POSTに置き換え

    modal.remove();
    alert('送信しました');
  };
}

// ===== helpers =====
function buildStartOptions(modal, start, end) {

  const select = modal.querySelector('#startTime');

  let t = new Date(start);

  while (t < end) {
    addOption(select, formatTime(t), formatTime(t));
    t = new Date(t.getTime() + 10 * 60000);
  }
}

function updateDuration(modal, type) {

  const select = modal.querySelector('#duration');
  select.innerHTML = '';

  if (type === 'CALL') {
    for (let i = 10; i <= 120; i += 10) {
      addOption(select, `${i}分`, i);
    }
  } else {
    for (let i = 60; i <= 240; i += 60) {
      addOption(select, `${i}分`, i);
    }
  }
}

function addOption(select, label, value) {
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}

function formatTime(d) {
  return d.toTimeString().slice(0,5);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function isMobile() {
  return window.innerWidth < 768;
}
