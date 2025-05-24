const urls = {
    AM: {
        production: {
            envio: "https://nfce.sefaz.am.gov.br/services/NfeAutorizacao4",
            qrCode: "https://www.sefaz.am.gov.br/nfce",
        },
        homologation: {
            envio: "https://homnfce.sefaz.am.gov.br/services/NfeAutorizacao4",
            qrCode: "https://homnfce.sefaz.am.gov.br/nfce",
        },
    },
    PB: {
        production: {
            envio: "https://nfce.sefaz.pb.gov.br/NFCEe4/services/NfeAutorizacao4",
            qrCode: "http://www.sefaz.pb.gov.br/nfce",
        },
        homologation: {
            envio: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
            qrCode: "http://homolog.sefaz.pb.gov.br/nfce",
        },
    },
    PI: {
        production: {
            envio: "https://nfe.sefaz.pi.gov.br/nfe/services/NfeAutorizacao4",
            qrCode: "https://www.sefaz.pi.gov.br/nfce",
        },

        homologation: {
            envio: "https://homolog.sefaz.pi.gov.br/nfe/services/NfeAutorizacao4",
            qrCode: "https://homolog.sefaz.pi.gov.br/nfce",
        },
    },
    RN: {
        production: {
            envio: "https://nfce.set.rn.gov.br/NfeAutorizacao4/NfeAutorizacao4.asmx",
            qrCode: "https://www.set.rn.gov.br/nfce",
        },
        homologation: {
            envio: "https://hom.nfce.set.rn.gov.br/NfeAutorizacao4/NfeAutorizacao4.asmx",
            qrCode: "https://hom.nfce.set.rn.gov.br/nfce",
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