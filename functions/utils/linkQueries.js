const GET_LINKS = `
# Write your query or mutation here
query{
  allLinks{
    data {
      opponents
    }
  }
}`;

const CREATE_LINK = `
    mutation($opponents: String!, $opponentsreps: String!, $challengetype: String!, $challengereps: String! ){
        createLink(data:{opponents:$opponents, opponentsreps:$opponentsreps, challengetype:$challengetype, challengereps:$challengereps}){
            _id
        }
    }
`;

const SEARCH_LINK = `
            query($id: ID!) {
                findLinkByID(id: $id){
                _id
                opponents
                opponentsreps
                challengetype
                challengereps
                challengerules
             }
            }`;


const UPDATE_LINK = `
  mutation($id: ID!, $opponents: String!, $opponentsreps: String!, $challengetype: String!, $challengereps: String!  ) {
        updateLink(id: $id, data:{opponents:$opponents, opponentsreps:$opponentsreps, challengetype:$challengetype, challengereps:$challengereps}) {
            identifier
        }
    }
`;


const DELETE_LINK = `
  mutation($id: ID!) {
        deleteLink( id: $id) {
            _id
        }
    }
`;

module.exports = {
    GET_LINKS,
    CREATE_LINK,
    UPDATE_LINK,
    DELETE_LINK,
    SEARCH_LINK
};