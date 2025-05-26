const urls = {
    AM: {
        production: {
            envio: "https://nfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4",
            qrCode: "https://sistemas.sefaz.am.gov.br/nfceweb/consultarNFCe.jsp?",
        },
        homologation: {
            envio: "https://homnfce.sefaz.am.gov.br/nfce-services/services/NfeAutorizacao4",
            qrCode: "https://sistemas.sefaz.am.gov.br/nfceweb-hom/consultarNFCe.jsp?",
        },
    },
    PB: {
        production: {
            envio: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.sefaz.pb.gov.br/nfce",
        },
        homologation: {
            envio: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.sefaz.pb.gov.br/nfcehom",
        },
    },
    PI: {
        production: {
            envio: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://www.sefaz.pi.gov.br/nfce/qrcode",
        },
        homologation: {
            envio: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://webas.sefaz.pi.gov.br/nfceweb/consultarNFCe.jsf?",
        },
    },
    RN: {
        production: {
            envio: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://nfce.set.rn.gov.br/consultarNFCe.aspx?",
        },
        homologation: {
            envio: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
            qrCode: "http://hom.nfce.set.rn.gov.br/consultarNFCe.aspx?",
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