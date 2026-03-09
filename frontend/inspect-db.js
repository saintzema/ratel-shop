const http = require('http');

http.get('http://localhost:3000/api/products?all=true', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            const parsedData = JSON.parse(rawData);
            console.log("Total Products:", parsedData.length);
            const globalProducts = parsedData.filter(p => !!p && (p.seller_id === 'global-partners' || (p.seller_name && p.seller_name.toLowerCase().includes('global store'))));
            console.log("Global Products Count:", globalProducts.length);
            // Print the most recent global product added
            if (globalProducts.length > 0) {
                globalProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                console.log("Latest Global Product:", JSON.stringify(globalProducts[0], null, 2));
            } else {
                console.log("No global products found.");
            }
        } catch (e) {
            console.error("JSON Parsing failed", e.message);
        }
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
