/**
 * The SourceCorrectionsImage class.
 *
 * It is used in the context of the edition view
 * to store the data for a single source CorrectionsImages
 * from a source CorrectionsImages json file.
 */
export class SourceCorrectionsImage {
    /**
     * The src of a sourceCorrectionsImage.
     */
    src: string;

    /**
     * The alt of a sourceCorrectionsImage.
     */
    alt: string;
}

/**
 * The SourceCorrectionsImagesList class.
 *
 * It is used in the context of the edition view
 * to store the data for a source CorrectionsImages list
 * from a source CorrectionsImages json file.
 */
export class SourceCorrectionsImagesList {
    /**
     * The array of source corrections images for a corrId.
     */
    [corrId: string]: {
        [measureId: string]: SourceCorrectionsImage;
    };
}
