const { getSupabase } = require('./_lib/supabase');

module.exports = async (req, res) => {
    const supabase = getSupabase();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { method, query, body } = req;
    const { id, action } = query;

    try {
        // GET /api/company?id=1&action=settings
        if (method === 'GET' && action === 'settings') {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return res.json(data);
        }

        // GET /api/company?id=1&action=employees
        if (method === 'GET' && action === 'employees') {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('company_id', id)
                .order('id', { ascending: false });

            if (error) throw error;
            return res.json(data || []);
        }

        // PUT /api/company?id=1&action=settings
        if (method === 'PUT' && action === 'settings') {
            const { data, error } = await supabase
                .from('companies')
                .update(body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return res.json({ success: true, company: data });
        }

        res.status(404).json({ error: 'Not found' });

    } catch (error) {
        console.error('Company API Error:', error);
        res.status(500).json({ error: error.message });
    }
};
