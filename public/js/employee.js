let employeeData = null;
let companyData = null;

window.addEventListener('DOMContentLoaded', async () => {
    await autoDetectEmployee();
});

async function autoDetectEmployee() {
    try {
        const response = await fetch('/api/employee?action=auto-detect');
        const data = await response.json();

        document.getElementById('loading').style.display = 'none';

        if (data.detected) {
            employeeData = data.employee;
            companyData = data.company;
            showEmployeeCard();
            await loadAttendanceHistory();
        } else {
            document.getElementById('notRegistered').style.display = 'block';
            document.getElementById('clientIP').textContent = data.client_ip;
        }

    } catch (error) {
        document.getElementById('loading').style.display = 'none';
        showMessage('❌ خطأ في الاتصال', 'error');
    }
}

function showEmployeeCard() {
    document.getElementById('idCard').style.display = 'block';
    document.getElementById('attendanceSection').style.display = 'block';

    document.getElementById('companyName').textContent = companyData.name;
    document.getElementById('employeeName').textContent = employeeData.name;
    document.getElementById('employeeDepartment').textContent = `القسم: ${employeeData.department}`;
    document.getElementById('employeeCode').textContent = employeeData.employee_code;

    if (companyData.logo_url) {
        document.getElementById('companyLogo').src = companyData.logo_url;
    }

    if (companyData.brand_color) {
        document.getElementById('idCard').style.background =
            `linear-gradient(135deg, ${companyData.brand_color} 0%, ${adjustColor(companyData.brand_color, -20)} 100%)`;
    }

    new QRCode(document.getElementById('qrcode'), {
        text: employeeData.employee_code,
        width: 128,
        height: 128
    });
}

document.getElementById('attendanceBtn').addEventListener('click', async () => {
    const btn = document.getElementById('attendanceBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> جاري التسجيل...';

    showMessage('جاري الحصول على موقعك...', 'info');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            try {
                const response = await fetch('/api/attendance?action=auto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lat: latitude,
                        lng: longitude,
                        accuracy: Math.round(accuracy)
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showMessage(
                        `✅ تم تسجيل ${data.action} بنجاح!\n` +
                        `الوقت: ${new Date(data.time).toLocaleTimeString('ar-EG')}\n` +
                        `المسافة: ${data.distance} متر`,
                        'success'
                    );
                    await loadAttendanceHistory();
                } else {
                    showMessage('❌ ' + data.error, 'error');
                }

            } catch (error) {
                showMessage('❌ خطأ في الاتصال', 'error');
            }

            btn.disabled = false;
            btn.innerHTML = '📍 تسجيل حضور / انصراف';
        },
        (error) => {
            showMessage('❌ خطأ في تحديد الموقع', 'error');
            btn.disabled = false;
            btn.innerHTML = '📍 تسجيل حضور / انصراف';
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
});

async function loadAttendanceHistory() {
    if (!employeeData) return;

    try {
        const response = await fetch(`/api/employee?id=${employeeData.id}&action=attendance`);
        const records = await response.json();

        const historyDiv = document.getElementById('attendanceHistory');

        if (records.length === 0) {
            historyDiv.innerHTML = '<p style="text-align: center; color: #999;">لا يوجد سجل</p>';
            return;
        }

        const recentRecords = records.slice(0, 10);

        historyDiv.innerHTML = '<h3 style="margin-bottom: 15px;">آخر السجلات</h3>';

        recentRecords.forEach(record => {
            const time = new Date(record.time);
            const div = document.createElement('div');
            div.className = `attendance-record record-${record.action}`;

            div.innerHTML = `
        <div>
          <strong>${record.action === 'checkin' ? '🟢 حضور' : '🔴 انصراف'}</strong>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">
            ${time.toLocaleDateString('ar-EG')}
          </div>
        </div>
        <div style="text-align: left;">
          <strong>${time.toLocaleTimeString('ar-EG')}</strong>
        </div>
      `;

            historyDiv.appendChild(div);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

function showMessage(text, type) {
    const msgDiv = document.getElementById('statusMessage');
    msgDiv.textContent = text;
    msgDiv.className = `status-message status-${type}`;
    msgDiv.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
    }
}

function adjustColor(color, amount) {
    const clamp = (val) => Math.min(Math.max(val, 0), 255);
    const num = parseInt(color.replace('#', ''), 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00FF) + amount);
    const b = clamp((num & 0x0000FF) + amount);
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
