/* Copyright © 2016 Lukas Rosenthaler, André Kilchenmann, Andreas Aeschlimann,
 * Sofia Georgakopoulou, Ivan Subotic, Benjamin Geer, Tobias Schweizer.
 * This file is part of SALSAH.
 * SALSAH is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * SALSAH is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * You should have received a copy of the GNU Affero General Public
 * License along with SALSAH.  If not, see <http://www.gnu.org/licenses/>.
 * */

import { JsonObject, JsonProperty } from 'json2typescript';
import { KnoraIRI, KnoraRights } from './basic-type-aliases';

/**
 * Represents a Knora project
 * @used by UserdataJson
 */
@JsonObject('ProjectItemJson')
export class ProjectItemJson {
    /**
     * Path to the project's file
     * @param basepath: string | null
     */
    @JsonProperty('basepath', String, true)
    public basepath: string = undefined;

    /**
     * The institution a project belongs to
     * @param belongsToInstitution: any
     */
    @JsonProperty('belongsToInstitution', null)
    public belongsToInstitution: any = undefined;

    /**
     * A named data graph
     * @param dataNamedGraph
     */
    @JsonProperty('dataNamedGraph', String)
    public dataNamedGraph: string = undefined;

    /**
     * Description of the project
     * @param description: string | null
     */
    @JsonProperty('description', String, true)
    public description: string = undefined;

    /**
     * Option for users to self join a project
     * @param hasSelfJoinEnabled: boolean
     */
    @JsonProperty('hasSelfJoinEnabled', Boolean)
    public hasSelfJoinEnabled = false;

    /**
     * The project's IRI
     * @param id: KnoraIRI
     */
    @JsonProperty('id', String)
    public id: KnoraIRI = undefined;

    /**
     * Keywords describing the project
     * @param keywords: string | null
     */
    @JsonProperty('keywords', String, true)
    public keywords: string = undefined;

    /**
     * The project's logo
     * @param logo: string | null
     */
    @JsonProperty('logo', String, true)
    public logo: string = undefined;

    /**
     * Project's long name
     * @param longname: string
     */
    @JsonProperty('longname', String)
    public longname: string = undefined;

    /**
     * Project's long name
     * @param ontologyNamedGraph: string
     */
    @JsonProperty('ontologyNamedGraph', String)
    public ontologyNamedGraph: string = undefined;

    /**
     * Obsolete
     * @param rights: KnoraRights | null
     */
    @JsonProperty('rights', Number, true)
    public rights: KnoraRights = undefined;

    /**
     * Project's short name
     * @param shortname: string
     */
    @JsonProperty('shortname', String)
    public shortname: string = undefined;
}
