// src/utils/loanCalc.js

export function safeNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

export function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(isoDate, days) {
    const d = new Date(isoDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/**
 * ✅ Interest rules (as per your requirement)
 * INTEREST_RATE is TOTAL % for the whole duration (weeks)
 * Weekly interest % = totalInterestPercent / weeks
 * Total interest amount = principal * totalInterestPercent / 100
 * Interest per week = totalInterestAmount / weeks
 */
export function calcInterest({principal, weeks, totalInterestPercent}) {
    const P = safeNum(principal);
    const W = Math.max(0, safeNum(weeks));
    const rTotal = safeNum(totalInterestPercent);

    const weeklyInterestPercent = W ? round2(rTotal / W) : 0;

    const totalInterestAmount = round2((P * rTotal) / 100);
    const interestPerWeek = W ? round2(totalInterestAmount / W) : 0;

    return {
        totalInterestPercent: rTotal,
        weeklyInterestPercent,
        totalInterestAmount,
        interestPerWeek,
    };
}

/**
 * ✅ Fees (only first installment)
 * processing & insurance are % of principal
 * bookPrice is fixed amount
 */
export function calcFees({principal, processingPct, insurancePct, bookPriceAmt}) {
    const P = safeNum(principal);
    const pPct = safeNum(processingPct);
    const iPct = safeNum(insurancePct);
    const book = round2(safeNum(bookPriceAmt));

    const processingFeeAmt = round2((P * pPct) / 100);
    const insuranceFeeAmt = round2((P * iPct) / 100);

    const firstInstallmentExtra = round2(processingFeeAmt + insuranceFeeAmt + book);

    return {
        processingFeeAmt,
        insuranceFeeAmt,
        bookPriceAmt: book,
        firstInstallmentExtra,
    };
}

/**
 * ✅ Weekly breakdown for principal & installment
 */
export function calcWeeklyBreakdown({principal, weeks, totalInterestAmount}) {
    const P = safeNum(principal);
    const W = Math.max(0, safeNum(weeks));
    const TI = safeNum(totalInterestAmount);

    const principalPerWeek = W ? round2(P / W) : 0;
    const interestPerWeek = W ? round2(TI / W) : 0;

    const installmentPerWeek = W ? round2((P + TI) / W) : 0;

    return {principalPerWeek, interestPerWeek, installmentPerWeek};
}

/**
 * ✅ Build schedule rows with first installment extra added only to first row
 */
export function buildScheduleRows({
                                      weeks,
                                      principal,
                                      firstInstallmentDate,
                                      principalPerWeek,
                                      interestPerWeek,
                                      firstInstallmentExtra,
                                  }) {
    const W = Math.max(0, safeNum(weeks));
    const P = safeNum(principal);
    if (!W || !P) return [];

    const first = firstInstallmentDate || todayISO();
    let bal = P;

    const rows = [];
    for (let i = 0; i < W; i++) {
        const dueDate = addDaysISO(first, i * 7);

        const p = principalPerWeek;
        const it = interestPerWeek;
        const fees = i === 0 ? firstInstallmentExtra : 0;

        const total = round2(p + it + fees);
        bal = Math.max(0, round2(bal - p));

        rows.push({
            inst_no: i + 1,
            due_date: dueDate,
            principal_due: p,
            interest_due: it,
            fees_due: fees,
            total_due: total,
            principal_balance: bal,
        });
    }

    return rows;
}

/**
 * ✅ One-shot calculator: use this from component
 */
export function computeLoanNumbers({
                                       principal,
                                       weeks,
                                       totalInterestPercent,
                                       processingPct,
                                       insurancePct,
                                       bookPriceAmt,
                                       firstInstallmentDate,
                                   }) {
    const interest = calcInterest({
        principal,
        weeks,
        totalInterestPercent,
    });

    const fees = calcFees({
        principal,
        processingPct,
        insurancePct,
        bookPriceAmt,
    });

    const weekly = calcWeeklyBreakdown({
        principal,
        weeks,
        totalInterestAmount: interest.totalInterestAmount,
    });

    const scheduleRows = buildScheduleRows({
        weeks,
        principal,
        firstInstallmentDate,
        principalPerWeek: weekly.principalPerWeek,
        interestPerWeek: weekly.interestPerWeek,
        firstInstallmentExtra: fees.firstInstallmentExtra,
    });

    return {
        ...interest,
        ...fees,
        ...weekly,
        scheduleRows,
    };
}
