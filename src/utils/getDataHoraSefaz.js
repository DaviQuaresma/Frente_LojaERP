module.exports = function getDataHoraFormatoSefaz(data = new Date()) {
    const pad = (n) => n.toString().padStart(2, '0');

    const yyyy = data.getFullYear();
    const mm = pad(data.getMonth() + 1);
    const dd = pad(data.getDate());
    const hh = pad(data.getHours());
    const mi = pad(data.getMinutes());
    const ss = pad(data.getSeconds());

    // Exemplo: -03:00
    const offset = -data.getTimezoneOffset();
    const sinal = offset >= 0 ? "+" : "-";
    const offsetHr = pad(Math.floor(Math.abs(offset) / 60));
    const offsetMin = pad(Math.abs(offset) % 60);

    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sinal}${offsetHr}:${offsetMin}`;
}