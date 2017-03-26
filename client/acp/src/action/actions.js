/**
 * Flux Standard Actions
 *
 * Human-friendly. FSA actions should be easy to read and write by humans.
 * Useful. FSA actions should enable the creation of useful tools and abstractions.
 * Simple. FSA should be simple, straightforward, and flexible in its design.
 */
import * as ActionTypes from '../model/action-types';
import SocketService from '../service/socket-service';

export function cancelAwardEdit(aid) {
    return {
        type   : ActionTypes.AWARD_EDIT_DID_CANCEL,
        payload: aid
    };
}

export function editAward(aid, award) {
    return {
        type   : ActionTypes.AWARD_DID_EDIT,
        payload: {aid, award}
    };
}

export function getAwardsAll() {
    return (dispatch) => {
        SocketService.getAwards().then((awards) => {
            dispatch(setAwards(awards));
        });
    };
}

export function setAwardCreationState(state) {
    return {
        type   : ActionTypes.AWARD_CREATION_STATE_DID_UPDATE,
        payload: state
    };
}

export function setAwardEditIndex(index) {
    return {
        type   : ActionTypes.AWARD_EDIT_INDEX_DID_UPDATE,
        payload: index
    };
}

export function setAwards(list) {
    return {
        type   : ActionTypes.AWARDS_DID_UPDATE,
        payload: list
    };
}

export function setSection(sectionName) {
    return {
        type   : ActionTypes.SECTION_DID_UPDATE,
        payload: sectionName
    };
}

export function startAwardEdit(aid, award) {
    return {
        type   : ActionTypes.AWARD_EDIT_DID_START,
        payload: {aid, award}
    };
}
