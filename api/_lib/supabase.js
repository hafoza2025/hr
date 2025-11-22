const { createClient } = require('@supabase/supabase-js');

let supabase;

function getSupabase() {
    if (!supabase) {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY
        );
    }
    return supabase;
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        '127.0.0.1';
}

function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function generateEmployeeCode(companyId) {
    const supabase = getSupabase();

    const { data: company } = await supabase
        .from('companies')
        .select('company_code')
        .eq('id', companyId)
        .single();

    const prefix = company?.company_code || 'EMP';

    const { data: employees } = await supabase
        .from('employees')
        .select('employee_code')
        .eq('company_id', companyId)
        .order('id', { ascending: false })
        .limit(1);

    let nextNum = 1;
    if (employees && employees.length > 0) {
        const match = employees[0].employee_code.match(/\d+$/);
        nextNum = match ? parseInt(match[0]) + 1 : 1;
    }

    return `${prefix}-EMP-${String(nextNum).padStart(6, '0')}`;
}

module.exports = {
    getSupabase,
    getClientIP,
    haversine,
    generateEmployeeCode
};
