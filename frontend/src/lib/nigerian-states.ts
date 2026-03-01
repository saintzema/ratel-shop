export const NIGERIAN_STATES = [
    {
        state: "Lagos",
        cities: ["Ikeja", "Lekki", "Victoria Island", "Surulere", "Yaba", "Agege", "Ikorodu", "Epe", "Badagry"],
        delivery_days: 3 // Base delivery time
    },
    {
        state: "Abuja (FCT)",
        cities: ["Garki", "Wuse", "Wuse 2", "Maitama", "Asokoro", "Gwarinpa", "Kubwa", "Lugbe"],
        delivery_days: 2
    },
    {
        state: "Anambra",
        cities: ["Awka", "Onitsha", "Obosi", "Nnewi"],
        delivery_days: 3
    },
    {
        state: "Rivers",
        cities: ["Port Harcourt", "Obio-Akpor", "Bonny", "Degema", "Okrika"],
        delivery_days: 3
    },
    {
        state: "Oyo",
        cities: ["Ibadan", "Ogbomosho", "Oyo", "Iseyin"],
        delivery_days: 4
    },
    {
        state: "Kano",
        cities: ["Kano", "Rano", "Gwarzo"],
        delivery_days: 3
    },
    {
        state: "Kaduna",
        cities: ["Kaduna", "Zaria", "Kafanchan"],
        delivery_days: 3
    },
    {
        state: "Enugu",
        cities: ["Enugu", "Nsukka", "Agbani"],
        delivery_days: 3
    },
    {
        state: "Delta",
        cities: ["Warri", "Asaba", "Sapele", "Ughelli"],
        delivery_days: 3
    },
    {
        state: "Ogun",
        cities: ["Abeokuta", "Ijebu-Ode", "Sagamu", "Ota"],
        delivery_days: 3
    },
    {
        state: "Edo",
        cities: ["Benin City", "Auchi", "Ekpoma"],
        delivery_days: 3
    },
    {
        state: "Osun",
        cities: ["Ile-Ife", "Osogbo", "Ipetumodu"],
        delivery_days: 3
    }
];

export const getDeliveryDate = (state: string): string => {
    const daysToAdd = NIGERIAN_STATES.find(s => s.state === state)?.delivery_days || 5;
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);

    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
};
