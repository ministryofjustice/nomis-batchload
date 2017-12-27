const {
    sandbox,
    expect,
    nock
} = require('../supertestSetup');

const config = require('../../server/config');
const createSignInService = require('../../server/authentication/signIn');
const signInService = createSignInService();

const fakeNomis = nock(`${config.nomis.apiUrl}`);

const rolesResponse = [
    {
        roleId: 0,
        roleName: 'roleNameValue',
        roleCode: 'roleCodeValue',
        parentRoleCode: 'parentRoleCodeValue'
    }
];

const loginResponse = {token: 'tokenValue'};
const profileResponse = {profile: 'profileValue'};

describe('signIn', () => {

    afterEach(() => {
        nock.cleanAll();
        sandbox.reset();
    });

    it('should call api for login, profile, role, and return user profile', async () => {

        fakeNomis
            .post('/users/login', {
                username: 'user',
                password: 'pass'
            })
            .reply(function(uri, requestBody) {
                // The documented way to specify request headers doesn't work so this is a workaround
                if (this.req.headers['authorization']) { // eslint-disable-line
                    return 200, loginResponse;
                }
                return null;
            });

        fakeNomis
            .get('/users/me')
            .reply(function(uri, requestBody) {
                if (this.req.headers['authorization'] && this.req.headers['elite-authorization'] === 'tokenValue') { // eslint-disable-line
                    return 200, profileResponse;
                }
                return null;
            });

        fakeNomis
            .get('/users/me/roles')
            .reply(function(uri, requestBody) {
                if (this.req.headers['authorization'] && this.req.headers['elite-authorization'] === 'tokenValue') { // eslint-disable-line
                    return 200, rolesResponse;
                }
                return null;
            });

        const profileResult = await signInService.signIn('user', 'pass');

        expect(profileResult.token).to.equal('tokenValue');
        expect(profileResult.roleCode).to.equal('roleCodeValue');
        expect(profileResult).to.contain(profileResponse);
    });


    it('should fail when api error', async () => {

        fakeNomis
            .post('/users/login')
            .reply(500);

        return expect(signInService.signIn('user', 'pass')).to.be.rejected();
    });

    it('should fail when unexpected status', async () => {

        fakeNomis
            .post('/users/login')
            .reply(203);

        return expect(signInService.signIn('user', 'pass')).to.be.rejected();
    });
});
