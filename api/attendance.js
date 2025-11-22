const { getSupabase, getClientIP, haversine } = require('./_lib/supabase');

module.exports = async (req, res) => {
    const supabase = getSupabase();

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, query, body } = req;
    const { action } = query;

    try {
        // GET /api/attendance?action=all
        if (method === 'GET' && action === 'all') {
            const { data } = await supabase
                .from('attendance')
                .select('*')
                .order('time', { ascending: false })
                .limit(500);

            return res.json(data || []);
        }

        // POST /api/attendance?action=auto
        if (method === 'POST' && action === 'auto') {
            const { lat, lng, accuracy } = body;
            const clientIP = getClientIP(req);

            // البحث عن الموظف بالـ IP
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('mobile_ip', clientIP)
                .single();

            if (!employee) {
                return res.status(403).json({
                    error: 'IP غير مسجل. اتصل بالإدارة.',
                    client_ip: clientIP
                });
            }

            // جلب بيانات الشركة
            const { data: company } = await supabase
                .from('companies')
                .select('*')
                .eq('id', employee.company_id)
                .single();

            // فحص دقة GPS
            if (!company.allow_mock && accuracy > 50) {
                return res.status(403).json({
                    error: `دقة GPS ضعيفة جداً (${accuracy} متر)`
                });
            }

            // حساب المسافة
            const distance = haversine(lat, lng, company.lat, company.lng);

            if (distance > company.radius_meters) {
                return res.status(403).json({
                    error: `أنت خارج نطاق العمل.\nالمسافة: ${Math.round(distance)} متر\nالمطلوب: أقل من ${company.radius_meters} متر`,
                    distance: Math.round(distance),
                    required: company.radius_meters
                });
            }

            // تحديد نوع الإجراء (حضور أو انصراف)
            const { data: lastEntry } = await supabase
                .from('attendance')
                .select('action')
                .eq('employee_id', employee.id)
                .order('time', { ascending: false })
                .limit(1)
                .single();

            const action = (!lastEntry || lastEntry.action === 'checkout') ? 'checkin' : 'checkout';

            // تسجيل الحضور
            const { data: newEntry, error } = await supabase
                .from('attendance')
                .insert({
                    employee_id: employee.id,
                    company_id: company.id,
                    action,
                    lat,
                    lng,
                    accuracy,
                    device_id: clientIP,
                    ip: clientIP
                })
                .select()
                .single();

            if (error) throw error;

            return res.json({
                success: true,
                action: action === 'checkin' ? 'حضور' : 'انصراف',
                time: newEntry.time,
                distance: Math.round(distance),
                employee_name: employee.name,
                employee_code: employee.employee_code
            });
        }

        res.status(404).json({ error: 'Not found' });

    } catch (error) {
        console.error('Attendance API Error:', error);
        res.status(500).json({ error: error.message });
    }
};
