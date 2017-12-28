const superagent = require('superagent');
const config = require('../config');
const generateApiGatewayToken = require('./apiGateway');
const logger = require('../../log');
const audit = require('../data/audit');

async function signIn(username, password, allowedRoles) {

    logger.info(`Log in for: ${username}`);

    try {
        const loginResult = await superagent
            .post(`${config.nomis.apiUrl}/users/login`)
            .set('Authorization', `Bearer ${generateApiGatewayToken()}`)
            .send({username, password})
            .timeout({response: 2000, deadline: 2500});

        logger.info(`Elite2 login result: [${loginResult.status}]`);

        if (loginResult.status !== 200 && loginResult.status !== 201) {
            logger.info(`Elite2 login failed for [${username}]`);
            logger.warn(loginResult.body);
            throw new Error('Login error');
        }

        logger.info(`Elite2 login success for [${username}]`);
        const eliteAuthorisationToken = loginResult.body.token;

        const profileResult = await superagent
            .get(`${config.nomis.apiUrl}/users/me`)
            .set('Authorization', `Bearer ${generateApiGatewayToken()}`)
            .set('Elite-Authorization', eliteAuthorisationToken);

        logger.info(`Elite2 profile success for [${username}]`);

        const role = await getRole(eliteAuthorisationToken, allowedRoles);
        const roleCode = role.roleCode.substring(role.roleCode.lastIndexOf('_') + 1);

        logger.info(`Elite2 profile success for [${username}] with role  [${roleCode}]`);
        audit.record('LOGIN', profileResult.body.email);
        return {...profileResult.body, ...{token: eliteAuthorisationToken}, ...{role}, ...{roleCode}};

    } catch (exception) {
        logger.error(`Elite 2 login error [${username}]:`);
        logger.error(exception);
        throw exception;
    }
}

async function getRole(eliteAuthorisationToken, allowedRoles) {
    const rolesResult = await superagent
        .get(`${config.nomis.apiUrl}/users/me/roles`)
        .set('Authorization', `Bearer ${generateApiGatewayToken()}`)
        .set('Elite-Authorization', eliteAuthorisationToken);

    logger.info('Roles response:');
    logger.info(rolesResult.body);

    const roles = rolesResult.body;

    if (roles && roles.length > 0) {
        const role = roles.find(role => {
            return allowedRoles.includes(role.roleCode);
        });

        if (role) {
            logger.info(`Selected role: ${role.roleCode}`);
            return role;
        }
    }

    throw new Error('Login error - no acceptable role');
}

function signInFor(username, password, allowedRoles) {
    return signIn(username, password, allowedRoles);
}

module.exports = function createSignInService() {
    // todo need to pass in audit to allow mocking for tests
    return {signIn: (username, password, allowedRoles) => signInFor(username, password, allowedRoles)};
};
