let employees = [];
let attendance = [];
let company = {};
let currentBindEmployeeId = null;

window.addEventListener('DOMContentLoaded', async () => {
  await loadCompanyData();
  await loadEmployees();
  await loadAttendance();
  updateStats();
  showRecentAttendance();
  
  const now = new Date();
  document.getElementById('reportMonth').value = now.getMonth() + 1;
  document.getElementById('reportYear').value = now.getFullYear();
  document.getElementById('filterDate').value = now.toISOString().split('T')[0];
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    item.classList.add('active');
    const section = item.dataset.section;
    document.getElementById(`${section}-section`).classList.add('active');
    document.getElementById('pageTitle').textContent = item.textContent;
    
    if (section === 'employees') loadEmployeesList();
    if (section === 'attendance') loadAttendanceList();
    if (section === 'settings') loadSettings();
  });
});

async function loadCompanyData() {
  try {
    const response = await fetch('/api/company?id=1&action=settings');
    company = await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadEmployees() {
  try {
    const response = await fetch('/api/company?id=1&action=employees');
    employees = await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}

async function loadAttendance() {
  try {
    const response = await fetch('/api/attendance?action=all');
    attendance = await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}

function updateStats() {
  document.getElementById('totalEmployees').textContent = employees.length;
  
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.time.startsWith(today));
  
  const presentIds = new Set(todayAttendance.filter(a => a.action === 'checkin').map(a => a.employee_id));
  document.getElementById('presentToday').textContent = presentIds.size;
  document.getElementById('absentToday').textContent = employees.length - presentIds.size;
  
  const lateCount = todayAttendance.filter(a => {
    if (a.action !== 'checkin') return false;
    const time = new Date(a.time);
    return time.getHours() > 8 || (time.getHours() === 8 && time.getMinutes() > 30);
  }).length;
  document.getElementById('lateToday').textContent = lateCount;
}

function showRecentAttendance() {
  const recent = attendance.slice(0, 10);
  const container = document.getElementById('recentAttendance');
  
  if (recent.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#999; padding: 20px;">لا توجد سجلات بعد</p>';
    return;
  }
  
  let html = '<table><thead><tr><th>الموظف</th><th>الكود</th><th>النوع</th><th>الوقت</th><th>التاريخ</th></tr></thead><tbody>';
  
  recent.forEach(record => {
    const emp = employees.find(e => e.id === record.employee_id);
    const time = new Date(record.time);
    const actionText = record.action === 'checkin' ? '🟢 حضور' : '🔴 انصراف';
    
    html += `
      <tr>
        <td>${emp ? emp.name : 'غير معروف'}</td>
        <td>${emp ? emp.employee_code : '-'}</td>
        <td>${actionText}</td>
        <td>${time.toLocaleTimeString('ar-EG')}</td>
        <td>${time.toLocaleDateString('ar-EG')}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function loadEmployeesList() {
  const container = document.getElementById('employeesList');
  
  if (employees.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#999; padding: 20px;">لا يوجد موظفين بعد</p>';
    return;
  }
  
  let html = '<table><thead><tr><th>الكود</th><th>الاسم</th><th>القسم</th><th>الهاتف</th><th>IP الموبايل</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>';
  
  employees.forEach(emp => {
    const ipStatus = emp.mobile_ip ? 
      `<span style="color: green; font-family: monospace; font-size: 12px;">${emp.mobile_ip}</span>` : 
      '<span style="color: #999;">غير مربوط</span>';
    
    html += `
      <tr>
        <td><strong>${emp.employee_code}</strong></td>
        <td>${emp.name}</td>
        <td>${emp.department}</td>
        <td>${emp.phone || '-'}</td>
        <td>${ipStatus}</td>
        <td><span style="color: ${emp.status === 'active' ? 'green' : 'red'}">${emp.status === 'active' ? '✓ نشط' : '✗ موقوف'}</span></td>
        <td>
          <button class="btn-primary" style="font-size: 12px; padding: 6px 12px; margin-left: 5px;" onclick="showBindIPModal(${emp.id})">
            ${emp.mobile_ip ? '🔄 تغيير IP' : '🔗 ربط IP'}
          </button>
          ${emp.mobile_ip ? `<button class="btn" style="background: #ff9800; color: white; font-size: 12px; padding: 6px 12px; margin-left: 5px;" onclick="unbindIP(${emp.id})">❌ إلغاء IP</button>` : ''}
          <button class="btn-danger" style="font-size: 12px; padding: 6px 12px;" onclick="deleteEmployee(${emp.id})">🗑️ حذف</button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function loadAttendanceList() {
  const filterDate = document.getElementById('filterDate').value;
  let filtered = attendance;
  
  if (filterDate) {
    filtered = attendance.filter(a => a.time.startsWith(filterDate));
  }
  
  const container = document.getElementById('attendanceList');
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#999; padding: 20px;">لا توجد سجلات</p>';
    return;
  }
  
  let html = '<table><thead><tr><th>الموظف</th><th>الكود</th><th>النوع</th><th>الوقت</th><th>التاريخ</th><th>IP</th></tr></thead><tbody>';
  
  filtered.forEach(record => {
    const emp = employees.find(e => e.id === record.employee_id);
    const time = new Date(record.time);
    const actionText = record.action === 'checkin' ? '🟢 حضور' : '🔴 انصراف';
    
    html += `
      <tr>
        <td>${emp ? emp.name : 'غير معروف'}</td>
        <td>${emp ? emp.employee_code : '-'}</td>
        <td><strong>${actionText}</strong></td>
        <td>${time.toLocaleTimeString('ar-EG')}</td>
        <td>${time.toLocaleDateString('ar-EG')}</td>
        <td><code style="font-size: 11px;">${record.ip || '-'}</code></td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function filterAttendance() {
  loadAttendanceList();
}

function loadSettings() {
  document.getElementById('companyName').value = company.name || '';
  document.getElementById('companyCode').value = company.company_code || '';
  document.getElementById('radiusMeters').value = company.radius_meters || 80;
  document.getElementById('companyLat').value = company.lat || 0;
  document.getElementById('companyLng').value = company.lng || 0;
  document.getElementById('allowVpn').checked = company.allow_vpn || false;
  document.getElementById('deviceLimit').checked = company.device_limit !== false;
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const updatedCompany = {
    name: document.getElementById('companyName').value,
    company_code: document.getElementById('companyCode').value,
    radius_meters: parseInt(document.getElementById('radiusMeters').value),
    lat: parseFloat(document.getElementById('companyLat').value),
    lng: parseFloat(document.getElementById('companyLng').value),
    allow_vpn: document.getElementById('allowVpn').checked,
    device_limit: document.getElementById('deviceLimit').checked
  };
  
  try {
    const response = await fetch('/api/company?id=1&action=settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCompany)
    });
    
    if (response.ok) {
      alert('✅ تم حفظ الإعدادات بنجاح');
      await loadCompanyData();
    } else {
      alert('❌ خطأ في الحفظ');
    }
  } catch (error) {
    alert('❌ خطأ في الاتصال');
  }
});

function showAddEmployeeModal() {
  document.getElementById('addEmployeeModal').classList.add('show');
  document.getElementById('newEmployeeName').focus();
}

function closeAddEmployeeModal() {
  document.getElementById('addEmployeeModal').classList.remove('show');
  document.getElementById('addEmployeeForm').reset();
}

document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const newEmployee = {
    name: document.getElementById('newEmployeeName').value.trim(),
    phone: document.getElementById('newEmployeePhone').value.trim(),
    department: document.getElementById('newEmployeeDepartment').value.trim()
  };
  
  try {
    const response = await fetch('/api/employee?companyId=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployee)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert(`✅ تم إضافة الموظف بنجاح!\n\nالكود: ${data.employee.employee_code}`);
      closeAddEmployeeModal();
      await loadEmployees();
      loadEmployeesList();
      updateStats();
    } else {
      alert('❌ ' + data.error);
    }
  } catch (error) {
    alert('❌ خطأ في الاتصال');
  }
});

function showBindIPModal(employeeId) {
  const employee = employees.find(e => e.id === employeeId);
  if (!employee) return;
  
  currentBindEmployeeId = employeeId;
  document.getElementById('bindEmployeeName').textContent = employee.name;
  document.getElementById('bindEmployeeCode').textContent = employee.employee_code;
  document.getElementById('employeeIP').value = employee.mobile_ip || '';
  document.getElementById('bindIPModal').classList.add('show');
  document.getElementById('employeeIP').focus();
}

function closeBindIPModal() {
  document.getElementById('bindIPModal').classList.remove('show');
  document.getElementById('bindIPForm').reset();
  currentBindEmployeeId = null;
}

document.getElementById('bindIPForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const ip = document.getElementById('employeeIP').value.trim();
  
  try {
    const response = await fetch(`/api/employee?id=${currentBindEmployeeId}&action=bind-ip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('✅ تم ربط IP بنجاح');
      closeBindIPModal();
      await loadEmployees();
      loadEmployeesList();
    } else {
      alert('❌ ' + data.error);
    }
  } catch (error) {
    alert('❌ خطأ في الاتصال');
  }
});

async function unbindIP(employeeId) {
  if (!confirm('هل تريد إلغاء ربط IP؟')) return;
  
  try {
    const response = await fetch(`/api/employee?id=${employeeId}&action=unbind-ip`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('✅ تم الإلغاء');
      await loadEmployees();
      loadEmployeesList();
    }
  } catch (error) {
    alert('❌ خطأ في الاتصال');
  }
}

async function deleteEmployee(id) {
  const employee = employees.find(e => e.id === id);
  if (!employee) return;
  
  if (!confirm(`هل أنت متأكد من حذف ${employee.name}؟`)) return;
  
  try {
    const response = await fetch(`/api/employee?id=${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert('✅ تم الحذف');
      await loadEmployees();
      await loadAttendance();
      loadEmployeesList();
      updateStats();
    }
  } catch (error) {
    alert('❌ خطأ في الاتصال');
  }
}

function generateReport() {
  const month = parseInt(document.getElementById('reportMonth').value);
  const year = parseInt(document.getElementById('reportYear').value);
  
  const filtered = attendance.filter(a => {
    const date = new Date(a.time);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
  
  const container = document.getElementById('reportContent');
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px;">لا توجد سجلات</p>';
    return;
  }
  
  container.innerHTML = `<p><strong>إجمالي السجلات:</strong> ${filtered.length}</p>`;
}

function exportToExcel() {
  alert('📥 تصدير Excel (قيد التطوير)');
}

window.onclick = function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('show');
  }
}
