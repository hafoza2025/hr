const { getSupabase, getClientIP, generateEmployeeCode } = require('./_lib/supabase');

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
    const { id, action, companyId } = query;

    try {
        // GET /api/employee?action=auto-detect
        if (method === 'GET' && action === 'auto-detect') {
            const clientIP = getClientIP(req);

            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('mobile_ip', clientIP)
                .single();

            if (employee) {
                const { data: company } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', employee.company_id)
                    .single();

                return res.json({
                    detected: true,
                    employee,
                    company,
                    client_ip: clientIP
                });
            }

            return res.json({
                detected: false,
                client_ip: clientIP,
                message: 'IP غير مسجل'
            });
        }

        // GET /api/employee?id=1
        if (method === 'GET' && id) {
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('id', id)
                .single();

            if (!employee) {
                return res.status(404).json({ error: 'الموظف غير موجود' });
            }

            const { data: company } = await supabase
                .from('companies')
                .select('*')
                .eq('id', employee.company_id)
                .single();

            return res.json({ employee, company });
        }

        // GET /api/employee?id=1&action=attendance
        if (method === 'GET' && id && action === 'attendance') {
            const { data } = await supabase
                .from('attendance')
                .select('*')
                .eq('employee_id', id)
                .order('time', { ascending: false })
                .limit(50);

            return res.json(data || []);
        }

        // POST /api/employee?companyId=1
        if (method === 'POST' && companyId) {
            const { name, phone, department } = body;

            if (!name || !department) {
                return res.status(400).json({ error: 'الاسم والقسم مطلوبان' });
            }

            const employeeCode = await generateEmployeeCode(parseInt(companyId));

            const { data, error } = await supabase
                .from('employees')
                .insert({
                    company_id: parseInt(companyId),
                    employee_code: employeeCode,
                    name,
                    phone: phone || null,
                    department
                })
                .select()
                .single();

            if (error) throw error;
            return res.json({ success: true, employee: data });
        }

        // POST /api/employee?id=1&action=bind-ip
        if (method === 'POST' && id && action === 'bind-ip') {
            const { ip } = body;

            const { data: existing } = await supabase
                .from('employees')
                .select('id')
                .eq('mobile_ip', ip)
                .neq('id', id)
                .single();

            if (existing) {
                return res.status(400).json({ error: 'هذا الـ IP مستخدم بالفعل' });
            }

            const { data, error } = await supabase
                .from('employees')
                .update({ mobile_ip: ip })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return res.json({ success: true, employee: data });
        }

        // DELETE /api/employee?id=1&action=unbind-ip
        if (method === 'DELETE' && id && action === 'unbind-ip') {
            await supabase
                .from('employees')
                .update({ mobile_ip: null })
                .eq('id', id);

            return res.json({ success: true });
        }

        // DELETE /api/employee?id=1
        if (method === 'DELETE' && id) {
            await supabase.from('employees').delete().eq('id', id);
            await supabase.from('attendance').delete().eq('employee_id', id);
            return res.json({ success: true });
        }

        res.status(404).json({ error: 'Not found' });

    } catch (error) {
        console.error('Employee API Error:', error);
        res.status(500).json({ error: error.message });
    }
};
