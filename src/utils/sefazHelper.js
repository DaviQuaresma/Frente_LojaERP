const urls = {
    AM: {
        production: {
            envio: "https://nfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4",
            qrCode: "https://www.sefaz.am.gov.br/nfce/consulta?",
        },
        homologation: {
            envio: "https://homnfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4",
            qrCode: "https://www.sefaz.am.gov.br/nfce/consulta?",
        },
    },
    PB: {
        production: {
            envio: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.sefaz.pb.gov.br/nfce/consulta",
        },
        homologation: {
            envio: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.sefaz.pb.gov.br/nfcehom",
        },
    },
    PI: {
        production: {
            envio: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.sefaz.pi.gov.br/nfce/consulta",
        },
        homologation: {
            envio: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "	http://www.sefaz.pi.gov.br/nfce/consulta",
        },
    },
    RN: {
        production: {
            envio: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.set.rn.gov.br/nfce/consulta?",
        },
        homologation: {
            envio: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.set.rn.gov.br/nfce/consulta?",
        },
    },
};

function getSefazInfo(uf, ambiente) {
    const amb = ambiente === "production" ? "production" : "homologation";
    const info = urls[uf]?.[amb];

    if (!info) throw new Error(`❌ UF ${uf} ou ambiente ${amb} não suportado`);

    return info;
}

module.exports = { getSefazInfo };