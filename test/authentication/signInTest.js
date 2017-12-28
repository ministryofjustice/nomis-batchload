const {
    sandbox,
    expect,
    nock
} = require('../supertestSetup');

const config = require('../../server/config');
const createSignInService = require('../../server/authentication/signIn');
const signInService = createSignInService();

const fakeNomis = nock(`${config.nomis.apiUrl}`);

const matchedRole = {
    roleId: 1,
    roleName: 'roleNameValue1',
    roleCode: 'SOME_ROLE_ALLOWED',
    parentRoleCode: 'parentRoleCodeValue1'
};

const unmatchedRole = {
    roleId: 0,
    roleName: 'roleNameValue0',
    roleCode: 'SOME_ROLE_WRONG',
    parentRoleCode: 'parentRoleCodeValue0'
};

const loginResponse = {token: 'tokenValue'};
const profileResponse = {profile: 'profileValue'};
const rolesResponse = [unmatchedRole, matchedRole];

describe('signIn', () => {

    afterEach(() => {
        nock.cleanAll();
        sandbox.reset();
    });

    function withLoginSuccess() {
        fakeNomis
            .post('/users/login', {
                username: 'user',
                password: 'pass'
            })
            .reply(function(uri, requestBody) {
                if (this.req.headers['authorization']) { // eslint-disable-line
                    return 200, loginResponse;
                }
                return null;
            });
    }

    function withProfileSuccess() {
        fakeNomis
            .get('/users/me')
            .reply(function(uri, requestBody) {
                if (this.req.headers['authorization'] && this.req.headers['elite-authorization'] === 'tokenValue') { // eslint-disable-line
                    return 200, profileResponse;
                }
                return null;
            });
    }

    function withRoleSuccess() {
        fakeNomis
            .get('/users/me/roles')
            .reply(function(uri, requestBody) {
                if (this.req.headers['authorization'] && this.req.headers['elite-authorization'] === 'tokenValue') { // eslint-disable-line
                    return 200, rolesResponse;
                }
                return null;
            });
    }

    function withSuccessResponses() {
        withLoginSuccess();
        withProfileSuccess();
        withRoleSuccess();
    }

    describe('calls nomis api', () => {

        it('should call api for login, profile, role, and return user profile', async () => {
            withSuccessResponses();
            const profileResult = await signInService.signIn('user', 'pass', ['SOME_ROLE_ALLOWED']);

            expect(profileResult.token).to.equal('tokenValue');
            expect(profileResult).to.contain(profileResponse);
        });


        it('should fail when api error', async () => {

            fakeNomis
                .post('/users/login')
                .reply(500);

            return expect(signInService.signIn('user', 'pass', ['SOME_ROLE_ALLOWED'])).to.be.rejected();
        });

        it('should fail when unexpected status', async () => {

            fakeNomis
                .post('/users/login')
                .reply(203);

            return expect(signInService.signIn('user', 'pass', ['SOME_ROLE_ALLOWED'])).to.be.rejected();
        });
    });

    describe('get roles', () => {

        it('should find first role matching batch user', async () => {
            withSuccessResponses();
            const profileResult = await signInService.signIn('user', 'pass', ['SOME_ROLE_ALLOWED']);
            expect(profileResult.role.roleCode).to.equal('SOME_ROLE_ALLOWED');
        });

        it('should return role suffix as role code', async () => {
            withSuccessResponses();
            const profileResult = await signInService.signIn('user', 'pass', ['SOME_ROLE_ALLOWED']);
            expect(profileResult.roleCode).to.equal('ALLOWED');
        });

        it('should error if no suitable roles', async () => {
            withSuccessResponses();
            return expect(signInService.signIn('user', 'pass', ['OTHER_ROLE_UNEXPECTED']))
                .to.eventually.be.rejectedWith(Error, 'Login error - no acceptable role');
        });
    });
});
