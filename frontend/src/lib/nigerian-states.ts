export const NIGERIAN_STATES = [
    {
        state: "Lagos",
        cities: ["Ikeja", "Lekki", "Victoria Island", "Surulere", "Yaba", "Agege", "Ikorodu", "Epe", "Badagry"],
        delivery_days: 2
    },
    {
        state: "Abuja (FCT)",
        cities: ["Garki", "Wuse", "Wuse 2", "Maitama", "Asokoro", "Gwarinpa", "Kubwa", "Lugbe"],
        delivery_days: 2
    },
    {
        state: "Abia",
        cities: ["Umuahia", "Aba", "Ohafia", "Bende"],
        delivery_days: 3
    },
    {
        state: "Adamawa",
        cities: ["Yola", "Mubi", "Ganye", "Numan"],
        delivery_days: 4
    },
    {
        state: "Akwa Ibom",
        cities: ["Uyo", "Eket", "Ikot Ekpene", "Oron"],
        delivery_days: 3
    },
    {
        state: "Anambra",
        cities: ["Awka", "Onitsha", "Obosi", "Nnewi", "Ekwulobia"],
        delivery_days: 3
    },
    {
        state: "Bauchi",
        cities: ["Bauchi", "Azare", "Misau", "Jama'are"],
        delivery_days: 4
    },
    {
        state: "Bayelsa",
        cities: ["Yenagoa", "Brass", "Ogbia", "Sagbama"],
        delivery_days: 4
    },
    {
        state: "Benue",
        cities: ["Makurdi", "Gboko", "Otukpo", "Katsina-Ala"],
        delivery_days: 4
    },
    {
        state: "Borno",
        cities: ["Maiduguri", "Biu", "Monguno", "Dikwa"],
        delivery_days: 5
    },
    {
        state: "Cross River",
        cities: ["Calabar", "Akamkpa", "Ikom", "Ogoja"],
        delivery_days: 4
    },
    {
        state: "Delta",
        cities: ["Warri", "Asaba", "Sapele", "Ughelli", "Agbor"],
        delivery_days: 3
    },
    {
        state: "Ebonyi",
        cities: ["Abakaliki", "Afikpo", "Onueke", "Ezzamgbo"],
        delivery_days: 4
    },
    {
        state: "Edo",
        cities: ["Benin City", "Auchi", "Ekpoma", "Uromi"],
        delivery_days: 3
    },
    {
        state: "Ekiti",
        cities: ["Ado-Ekiti", "Ikere", "Omuo", "Ido-Ekiti"],
        delivery_days: 3
    },
    {
        state: "Enugu",
        cities: ["Enugu", "Nsukka", "Agbani", "Udi"],
        delivery_days: 3
    },
    {
        state: "Gombe",
        cities: ["Gombe", "Kumo", "Billiri", "Dukku"],
        delivery_days: 4
    },
    {
        state: "Imo",
        cities: ["Owerri", "Orlu", "Okigwe", "Oguta"],
        delivery_days: 3
    },
    {
        state: "Jigawa",
        cities: ["Dutse", "Hadejia", "Birnin Kudu", "Gumel"],
        delivery_days: 4
    },
    {
        state: "Kaduna",
        cities: ["Kaduna", "Zaria", "Kafanchan", "Kagoro"],
        delivery_days: 3
    },
    {
        state: "Kano",
        cities: ["Kano", "Rano", "Gwarzo", "Dambatta"],
        delivery_days: 3
    },
    {
        state: "Katsina",
        cities: ["Katsina", "Daura", "Funtua", "Malumfashi"],
        delivery_days: 4
    },
    {
        state: "Kebbi",
        cities: ["Birnin Kebbi", "Argungu", "Yauri", "Zuru"],
        delivery_days: 4
    },
    {
        state: "Kogi",
        cities: ["Lokoja", "Okene", "Idah", "Kabba"],
        delivery_days: 3
    },
    {
        state: "Kwara",
        cities: ["Ilorin", "Offa", "Jebba", "Omu-Aran"],
        delivery_days: 3
    },
    {
        state: "Nasarawa",
        cities: ["Lafia", "Keffi", "Akwanga", "Karu"],
        delivery_days: 3
    },
    {
        state: "Niger",
        cities: ["Minna", "Bida", "Kontagora", "Suleja"],
        delivery_days: 3
    },
    {
        state: "Ogun",
        cities: ["Abeokuta", "Ijebu-Ode", "Sagamu", "Ota", "Ilaro"],
        delivery_days: 2
    },
    {
        state: "Ondo",
        cities: ["Akure", "Ondo", "Owo", "Okitipupa"],
        delivery_days: 3
    },
    {
        state: "Osun",
        cities: ["Ile-Ife", "Osogbo", "Ipetumodu", "Ilesa", "Ede"],
        delivery_days: 3
    },
    {
        state: "Oyo",
        cities: ["Ibadan", "Ogbomosho", "Oyo", "Iseyin", "Shaki"],
        delivery_days: 3
    },
    {
        state: "Plateau",
        cities: ["Jos", "Bukuru", "Pankshin", "Shendam"],
        delivery_days: 4
    },
    {
        state: "Rivers",
        cities: ["Port Harcourt", "Obio-Akpor", "Bonny", "Degema", "Okrika"],
        delivery_days: 3
    },
    {
        state: "Sokoto",
        cities: ["Sokoto", "Gwadabawa", "Tambuwal", "Bodinga"],
        delivery_days: 5
    },
    {
        state: "Taraba",
        cities: ["Jalingo", "Wukari", "Bali", "Gassol"],
        delivery_days: 5
    },
    {
        state: "Yobe",
        cities: ["Damaturu", "Gashua", "Potiskum", "Nguru"],
        delivery_days: 5
    },
    {
        state: "Zamfara",
        cities: ["Gusau", "Kaura Namoda", "Talata Mafara", "Anka"],
        delivery_days: 5
    }
];

export const getDeliveryDate = (location: string): string => {
    // If location is "City, State", extract the state
    const statePart = location.includes(",") ? location.split(",")[1].trim() : location;
    const daysToAdd = NIGERIAN_STATES.find(s => s.state === statePart)?.delivery_days || 5;
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);

    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
};
