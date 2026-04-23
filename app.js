// ===== 設定 =====
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwDmbS1gNoPLNwKH4oaTVgblGDhArpXY45yeToAJJ5-7eLXeryYhhx7vPdpCR1Xlp7W/exec"
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
    .catch(failure);
}

// ===== クリック処理 =====
function handleEventClick(info) {

  const start = new Date(info.event.start);
  const end   = new Date(info.event.end);

  const date = start.toISOString().slice(0,10);

  openBookingModal(date, start, end);
}

// ===== モーダル生成 =====
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
          <label class="label">開始時間</label>
          <div class="select is-fullwidth">
            <select id="startTime"></select>
          </div>
        </div>

        <div class="field">
          <label class="label">利用時間</label>
          <div class="select is-fullwidth">
            <select id="duration">
              <option value="10">10分</option>
              <option value="20">20分</option>
              <option value="30">30分</option>
              <option value="60">60分</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label class="label">名前</label>
          <input id="name" class="input">
        </div>

        <div class="field">
          <label class="label">メール</label>
          <input id="email" class="input">
        </div>

      </section>

      <footer class="modal-card-foot">
        <button class="button is-success" id="submitBtn">送信</button>
        <button class="button cancel">キャンセル</button>
      </footer>

    </div>
  `;

  document.body.appendChild(modal);

  // ===== 時間候補生成 =====
  const select = modal.querySelector('#startTime');

  let t = new Date(openStart);

  while (t < openEnd) {
    const opt = document.createElement('option');
    opt.value = formatTime(t);
    opt.textContent = formatTime(t);
    select.appendChild(opt);

    t = new Date(t.getTime() + 10 * 60000);
  }

  // ===== 閉じる =====
  modal.querySelector('.delete').onclick =
  modal.querySelector('.cancel').onclick =
  modal.querySelector('.modal-background').onclick = () => modal.remove();

  // ===== 送信 =====
  modal.querySelector('#submitBtn').onclick = async () => {

    const data = {
      date,
      start: modal.querySelector('#startTime').value,
      duration: modal.querySelector('#duration').value,
      name: modal.querySelector('#name').value,
      email: modal.querySelector('#email').value
    };

    await submitBooking(data);

    modal.remove();
    alert('送信しました');
  };
}

// ===== 送信 =====
async function submitBooking(data) {

  await fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// ===== ユーティリティ =====
function today() {
  return new Date().toISOString().split('T')[0];
}

function isMobile() {
  return window.innerWidth < 768;
}

function formatTime(d) {
  return d.toTimeString().slice(0,5);
}
