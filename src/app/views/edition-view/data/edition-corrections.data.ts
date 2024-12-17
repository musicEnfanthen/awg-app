/**
 * Object constant: EDITION_CORRECTIONS_DATA.
 *
 * It is used in the context of the edition view
 * to store the corrections data (image paths).
 */
export const EDITION_CORRECTIONS_DATA = {
    /**
     * The corrections for op3.
     */
    OP3: {
        SOURCE_AA_CORR_2: {
            T6_7A: {
                src: 'assets/img/edition/sources/ch-bps/saw/op3/Aa/corr_2/T6–7a.png',
                alt: 'T6–7a',
            },
            T6_7B: {
                src: 'assets/img/edition/sources/ch-bps/saw/op3/Aa/corr_2/T6–7b.png',
                alt: 'T6–7b',
            },
        },
        SOURCE_AB_CORR_2: {
            T3_5: {
                src: 'assets/img/edition/sources/ch-bps/saw/op3/Ab/corr_2/T3–5.png',
                alt: 'T3–5',
            },
            T6: {
                src: 'assets/img/edition/sources/ch-bps/saw/op3/Ab/corr_2/T6.png',
                alt: 'T6',
            },
            T8: {
                src: 'assets/img/edition/sources/ch-bps/saw/op3/Ab/corr_2/T8.png',
                alt: 'T8',
            },
            T10: {
                src: 'assets/img/edition/sources/ch-bps/saw/op3/Ab/corr_2/T10.png',
                alt: 'T10',
            },
        },
    },
    // Add more opera as needed
} as const;
