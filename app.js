const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbwDmbS1gNoPLNwKH4oaTVgblGDhArpXY45yeToAJJ5-7eLXeryYhhx7vPdpCR1Xlp7W/exec",
  PROVISIONAL_API_URL: "https://script.google.com/macros/s/AKfycbxo_e0AXrs-tvOXfEnBYK7Tkfr_k3DGtsEwy4RgYcpvBZodo9RS1PY-NIcrcprXG9XVaA/exec"
};

document.addEventListener('DOMContentLoaded', init);

function init() {
  const calendarEl = document.getElementById('calendar');
  const loadingEl  = document.getElementById('loading');

  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: 'ja',
    timeZone: 'local',
    buttonText: {
      today: '今日',
      month: '月',
      week: '週',
      day: '日'
    },

    eventDidMount: info => {
      console.log('[calendar:eventDidMount]', {
        title: info.event.title,
        start: info.event.start,
        end: info.event.end,
        allDay: info.event.allDay,
        extendedProps: info.event.extendedProps,
      });
    },

    initialView: isMobile() ? 'timeGridDay' : 'dayGridMonth',
    dayHeaderFormat: isMobile()
      ? { day: 'numeric' }
      : { month: 'numeric', day: 'numeric', weekday: 'short' },

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    views: {
      timeGridWeek: {
        allDaySlot: false
      },
      timeGridDay: {
        allDaySlot: false
      }
    },

    height: 'auto',
    nowIndicator: true,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    eventContent: arg => {
      const wrapper = document.createElement('div');

      if (!arg.event.allDay && arg.event.start && arg.event.end) {
        const time = document.createElement('div');
        time.className = 'fc-event-time';
        const startTime = formatHHmm(arg.event.start);
        const endTime = formatHHmm(arg.event.end);
        const isCompactView = arg.view.type === 'timeGridWeek' || arg.view.type === 'dayGridMonth';
        if (isCompactView) {
          time.innerHTML = `${startTime} -<br>${endTime}`;
        } else {
          time.textContent = `${startTime} - ${endTime}`;
        }
        wrapper.appendChild(time);
      }

      const title = document.createElement('div');
      title.className = 'fc-event-title';
      title.textContent = arg.event.title || '';
      wrapper.appendChild(title);

      return { domNodes: [wrapper] };
    },

    validRange: { start: today() },

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

  console.log('[fetchEvents:request]', {
    startStr: info.startStr,
    endStr: info.endStr,
    start,
    end,
    url: `${CONFIG.API_URL}?start=${start}&end=${end}`,
  });

  fetch(`${CONFIG.API_URL}?start=${start}&end=${end}`)
    .then(res => {
      console.log('[fetchEvents:response]', {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        url: res.url,
      });
      return res.json();
    })
    .then(data => {
      console.log('[fetchEvents:data]', data);

      if (!data.ok) {
        console.error('[fetchEvents:data:not_ok]', data);
        return failure(data.error);
      }

      const mappedEvents = (data.events || [])
        .filter(ev => ev && ev.title === 'OPEN')
        .map(ev => ({
          title: '空き',
          start: ev.start,
          end: ev.end,
          backgroundColor: '#4a90e2',
          borderColor: '#3b7cc5',
          textColor: '#ffffff'
        }));

      console.log('[fetchEvents:mappedEvents]', mappedEvents);
      success(mappedEvents);
    })
    .catch(err => {
      console.error('[fetchEvents:error]', err);
      failure(err);
    });
}

// ===== クリック =====
function handleEventClick(info) {
  console.log('[handleEventClick]', {
    event: info.event,
    start: info.event.start,
    end: info.event.end,
    startStr: info.event.startStr,
    endStr: info.event.endStr,
    allDay: info.event.allDay,
    extendedProps: info.event.extendedProps,
  });

  openBookingModal(
    new Date(info.event.start).toISOString().slice(0,10),
    new Date(info.event.start),
    new Date(info.event.end)
  );
}

// ===== モーダル =====
function openBookingModal(date, openStart, openEnd) {
  console.log('[openBookingModal:input]', {
    date,
    openStart,
    openEnd,
    openStartTime: openStart instanceof Date ? openStart.getTime() : null,
    openEndTime: openEnd instanceof Date ? openEnd.getTime() : null,
    openStartIsValid: openStart instanceof Date && !Number.isNaN(openStart.getTime()),
    openEndIsValid: openEnd instanceof Date && !Number.isNaN(openEnd.getTime()),
  });

  // 既存削除
  document.querySelectorAll('.modal').forEach(m => m.remove());

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

        <div class="field-row row-date-type-name">
          <div class="field field-date">
            <label class="label">日付</label>
            <input class="input" value="${date}" readonly>
          </div>

          <div class="field field-type">
            <label class="label">利用形式</label>
            <label class="radio"><input type="radio" name="type" value="CALL" checked> 通話</label>
            <label class="radio"><input type="radio" name="type" value="MEET"> 対面</label>
          </div>

          <div class="field field-name">
            <label class="label">名前</label>
            <input id="customerName" class="input" placeholder="お名前">
          </div>
        </div>

        <div class="field-row row-gender-email">
          <div class="field field-gender">
            <label class="label">性別</label>
            <label class="radio"><input type="radio" name="gender" value="MALE" checked> 男</label>
            <label class="radio"><input type="radio" name="gender" value="FEMALE"> 女</label>
            <p class="help is-danger">戸籍上の性別を入力してください。</p>
          </div>

          <div class="field field-email">
            <label class="label">メール</label>
            <input id="customerEmail" type="email" class="input" placeholder="example@example.com">
          </div>
        </div>

        <div class="field">
          <label class="label">連絡方法</label>
          <label class="radio"><input type="radio" name="contactPreference" value="EMAIL" checked> メール</label>
          <label class="radio"><input type="radio" name="contactPreference" value="LINE_PREFERRED"> LINE希望（未連携時はメール）</label>
        </div>

        <div class="field-row row-time">
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

          <div class="field">
            <label class="label">終了時間</label>
            <input class="input" id="endTime" readonly>
          </div>
        </div>

        <div id="meetingField" class="field" style="display:none;">
          <label class="label">待ち合わせ希望場所</label>
          <input id="meeting" class="input">
          <p class="help is-danger">待ち合わせ希望場所までの往復交通費は別途ご請求します。</p>
        </div>

        <div class="field">
          <label class="label">レンタル内容・ご要望</label>
          <textarea id="purpose" class="textarea"></textarea>
        </div>

        <div class="notification is-light">
          <p class="has-text-weight-semibold mb-1">参考価格</p>
          <p id="priceText">-</p>
          <p id="priceDetail" class="is-size-7 has-text-grey"></p>
        </div>

        <div class="notification is-warning is-light">
          <p class="is-size-7">
            本フォーム送信時点では仮予約です。支払い案内送付後、お支払い完了をもって本予約確定となります。
          </p>
          <p class="is-size-7 mt-2">
            表示金額は参考価格です。ご相談内容により金額は増減します。
          </p>
        </div>

      </section>

      <footer class="modal-card-foot">
        <button class="button is-success" id="submitBtn">送信</button>
        <button class="button cancel">キャンセル</button>
      </footer>

    </div>
  `;

  document.body.appendChild(modal);

  console.log('[openBookingModal:appended]', {
    modal,
    modalCount: document.querySelectorAll('.modal').length,
  });

  console.log('[openBookingModal:beforeBuildStartOptions]');
  buildStartOptions(modal, openStart, openEnd);
  modal.querySelector('#startTime').onchange = () => updateEndTime(modal);
  modal.querySelector('#duration').onchange = () => updateEndTime(modal);
  console.log('[openBookingModal:afterBuildStartOptions]', {
    startOptionCount: modal.querySelector('#startTime')?.options.length ?? null,
  });

  console.log('[openBookingModal:beforeUpdateDuration]', { type: 'CALL' });
  updateDuration(modal, 'CALL');
  updateEndTime(modal);
  updatePricePreview(modal);
  console.log('[openBookingModal:afterUpdateDuration]', {
    durationOptionCount: modal.querySelector('#duration')?.options.length ?? null,
  });

  modal.querySelectorAll('input[name="type"]').forEach(r => {
    r.onchange = () => {
      const type = r.value;
      console.log('[openBookingModal:typeChange]', { type });

      updateDuration(modal, type);
      updateEndTime(modal);
      updatePricePreview(modal);

      modal.querySelector('#meetingField').style.display =
        (type === 'MEET') ? '' : 'none';
    };
  });

  modal.querySelector('.delete').onclick =
  modal.querySelector('.cancel').onclick =
  modal.querySelector('.modal-background').onclick =
    () => modal.remove();

  modal.querySelector('#startTime').addEventListener('change', () => updatePricePreview(modal));
  modal.querySelector('#duration').addEventListener('change', () => updatePricePreview(modal));
  modal.querySelectorAll('input[name="gender"]').forEach(r => {
    r.addEventListener('change', () => updatePricePreview(modal));
  });

  modal.querySelector('#submitBtn').onclick = async () => {
    const formPayload = buildBookingPayload(modal, date);
    const validationError = validateBookingPayload(formPayload);
    if (validationError) {
      alert(validationError);
      return;
    }

    const submitBtn = modal.querySelector('#submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';

    try {
      const result = await postProvisionalReservation(formPayload);
      console.log('[openBookingModal:submit:result]', result);
      renderBookingResult(modal, formPayload, result);
    } catch (err) {
      console.error('[openBookingModal:submit:error]', err);
      alert(`送信に失敗しました: ${err.message || err}`);
      submitBtn.disabled = false;
      submitBtn.textContent = '送信';
    }
  };
}

function buildBookingPayload(modal, date) {
  const type = modal.querySelector('input[name="type"]:checked').value;
  const gender = modal.querySelector('input[name="gender"]:checked')?.value || '';
  const duration = Number(modal.querySelector('#duration').value);
  return {
    date,
    type,
    gender,
    name: modal.querySelector('#customerName').value.trim(),
    email: modal.querySelector('#customerEmail').value.trim(),
    start: modal.querySelector('#startTime').value,
    duration,
    meeting: modal.querySelector('#meeting').value.trim(),
    purpose: modal.querySelector('#purpose').value.trim(),
    estimatedPrice: getPriceEstimate(type, duration, gender).total,
    contactPreference: modal.querySelector('input[name="contactPreference"]:checked')?.value || 'EMAIL'
  };
}

function validateBookingPayload(payload) {
  if (!payload.name) return '名前を入力してください。';
  if (!payload.email) return 'メールを入力してください。';
  if (!isValidEmail(payload.email)) return 'メールアドレスの形式が不正です。';
  if (!payload.date) return '日付を指定してください。';
  if (!payload.start) return '開始時間を指定してください。';
  if (!Number.isFinite(payload.duration) || payload.duration <= 0) {
    return '利用時間が不正です。';
  }
  if (!payload.type) return '利用形式を選択してください。';
  if (!payload.gender || !['MALE', 'FEMALE'].includes(payload.gender)) {
    return '性別を選択してください。';
  }
  if (payload.type === 'MEET' && !payload.meeting) {
    return '対面の場合は待ち合わせ希望場所を入力してください。';
  }
  if (!payload.purpose) {
    return 'レンタル内容・ご要望を入力してください。';
  }
  return '';
}

async function postProvisionalReservation(payload) {
  const res = await fetch(CONFIG.PROVISIONAL_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data || data.ok !== true) {
    throw new Error((data && data.error) || 'APIエラー');
  }
  return data;
}

function renderBookingResult(modal, payload, apiResult) {
  const linkCode = apiResult.linkCode || '';
  const requestId = apiResult.requestId || '';
  const linePreferred = payload.contactPreference === 'LINE_PREFERRED';
  const lineGuide = linePreferred ? `
    <div class="notification is-info is-light mt-3">
      <p class="has-text-weight-semibold">LINE連携のお願い</p>
      <p class="is-size-7 mt-2">公式LINEを友だち追加後、トークで次の文言を送信してください。</p>
      <p class="is-size-6 mt-2"><code>連携 ${linkCode || '（コード発行待ち）'}</code></p>
      <p class="is-size-7 mt-2">連携が完了すると、以降のご案内をLINEで受け取れます（未連携時はメールでご案内します）。</p>
    </div>
  ` : '';

  modal.querySelector('.modal-card-body').innerHTML = `
    <div class="notification is-success is-light">
      <p class="has-text-weight-semibold">仮予約を受け付けました。</p>
      <p class="is-size-7 mt-2">受付内容の控えをメールでお送りします。</p>
      ${requestId ? `<p class="is-size-7 mt-1">受付ID: ${requestId}</p>` : ''}
    </div>
    ${lineGuide}
  `;

  modal.querySelector('.modal-card-foot').innerHTML = `
    <button class="button is-primary" id="closeAfterSubmit">閉じる</button>
  `;
  modal.querySelector('#closeAfterSubmit').onclick = () => modal.remove();
}

// ===== helpers =====
function buildStartOptions(modal, start, end) {
  console.log('[buildStartOptions:input]', {
    start,
    end,
    startTime: start instanceof Date ? start.getTime() : null,
    endTime: end instanceof Date ? end.getTime() : null,
    startIsValid: start instanceof Date && !Number.isNaN(start.getTime()),
    endIsValid: end instanceof Date && !Number.isNaN(end.getTime()),
  });

  const select = modal.querySelector('#startTime');

  let t = new Date(start);

  let optionCount = 0;

  while (t < end) {
    addOption(select, formatTime(t), formatTime(t));
    optionCount += 1;
    t = new Date(t.getTime() + 10 * 60000);
  }

  console.log('[buildStartOptions:result]', {
    optionCount,
    finalSelectCount: select.options.length,
  });
}

function updateDuration(modal, type) {
  console.log('[updateDuration:input]', { type });

  const select = modal.querySelector('#duration');
  select.innerHTML = '';

  let optionCount = 0;

  if (type === 'CALL') {
    for (let i = 10; i <= 120; i += 10) {
      addOption(select, `${i}分`, i);
      optionCount += 1;
    }
  } else {
    for (let i = 60; i <= 240; i += 60) {
      addOption(select, `${i}分`, i);
      optionCount += 1;
    }
  }

  console.log('[updateDuration:result]', {
    type,
    optionCount,
    finalSelectCount: select.options.length,
  });
}

function updateEndTime(modal) {
  const startValue = modal.querySelector('#startTime')?.value;
  const durationValue = Number(modal.querySelector('#duration')?.value);
  const endInput = modal.querySelector('#endTime');

  if (!startValue || !durationValue || Number.isNaN(durationValue)) {
    if (endInput) endInput.value = '';
    return;
  }

  const [h, m] = startValue.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  date.setMinutes(date.getMinutes() + durationValue);

  if (endInput) endInput.value = formatTime(date);
}

function updatePricePreview(modal) {
  const type = modal.querySelector('input[name="type"]:checked')?.value || 'CALL';
  const gender = modal.querySelector('input[name="gender"]:checked')?.value || 'MALE';
  const duration = Number(modal.querySelector('#duration')?.value || 0);
  const priceText = modal.querySelector('#priceText');
  const priceDetail = modal.querySelector('#priceDetail');
  if (!priceText || !priceDetail) return;

  const estimate = getPriceEstimate(type, duration, gender);
  priceText.textContent = `参考価格: ${formatYen(estimate.total)}`;
  priceDetail.textContent = estimate.detail;
}

function getPriceEstimate(type, durationMinutes, gender) {
  const minutes = Number.isFinite(durationMinutes) ? durationMinutes : 0;
  const isFemale = gender === 'FEMALE';
  if (type === 'CALL') {
    const unitPrice = isFemale ? 100 : 200;
    const total = minutes * unitPrice;
    return {
      total,
      detail: `通話 ${minutes}分 × ${unitPrice.toLocaleString('ja-JP')}円/分`
    };
  }

  const total = calcMeetPrice(minutes, isFemale);
  return {
    total,
    detail: buildMeetPriceDetail(minutes, isFemale)
  };
}

function calcMeetPrice(minutes, isFemale) {
  if (minutes <= 0) return 0;
  const blocks = Math.ceil(minutes / 60);
  let total = adjustByGender(15000, isFemale); // 最初の60分
  for (let i = 2; i <= blocks; i++) {
    if (i === 2) total += adjustByGender(10000, isFemale);
    else if (i === 3) total += adjustByGender(9000, isFemale);
    else total += adjustByGender(8000, isFemale); // 8000より下げない
  }
  return total;
}

function buildMeetPriceDetail(minutes, isFemale) {
  if (minutes <= 0) return '対面 0分';
  const blocks = Math.ceil(minutes / 60);
  const parts = [`60分 ${formatAmount(adjustByGender(15000, isFemale))}`];
  for (let i = 2; i <= blocks; i++) {
    if (i === 2) parts.push(`+ 60分 ${formatAmount(adjustByGender(10000, isFemale))}`);
    else if (i === 3) parts.push(`+ 60分 ${formatAmount(adjustByGender(9000, isFemale))}`);
    else parts.push(`+ 60分 ${formatAmount(adjustByGender(8000, isFemale))}`);
  }
  parts.push(`（当日延長: 30分 ${formatAmount(adjustByGender(4000, isFemale))}）`);
  return `対面 ${minutes}分: ${parts.join(' ')}`;
}

function adjustByGender(amount, isFemale) {
  return isFemale ? amount / 2 : amount;
}

function formatAmount(amount) {
  return `${Number(amount).toLocaleString('ja-JP')}円`;
}

function addOption(select, label, value) {
  console.log('[addOption]', { label, value, selectId: select.id || null });
  const opt = document.createElement('option');
  opt.value = value;
  opt.textContent = label;
  select.appendChild(opt);
}

function formatTime(d) {
  return d.toTimeString().slice(0,5);
}

function formatYen(value) {
  const n = Number(value) || 0;
  return `${n.toLocaleString('ja-JP')}円`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatHHmm(d) {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function isMobile() {
  return window.innerWidth < 768;
}
