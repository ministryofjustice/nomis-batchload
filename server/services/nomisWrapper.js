module.exports = {NomisWrapper};

function NomisWrapper(nomisClientBuilder, signInService, userInfo) {
    let client; // eslint-disable-line no-unused-vars
    this.nomisClientBuilder = nomisClientBuilder;
    this.signInService = signInService;
    this.userInfo = userInfo;
}

NomisWrapper.prototype.getClient = async function() {
    if (!this.client) {
        await this.login();
    }
    return this.client;
};

NomisWrapper.prototype.login = async function() {
    try {
        const user = await this.signInService.signIn(this.userInfo.name, this.userInfo.pass, this.userInfo.roles);
        this.client = await this.nomisClientBuilder(user.token);
    } catch (error) {
        throw new Error('Error logging in as user: ' + this.userInfo.name);
    }
};

NomisWrapper.prototype.getNomisIdForPnc = async function(pnc, retry = true) {
    try {
        const client = await this.getClient();
        return await client.getNomisIdForPnc(pnc);
    } catch (error) {
        if (isRetryable(error) && retry) {
            this.client = null;
            return await this.getNomisIdForPnc(pnc, false);
        }
        throw error;
    }
};

NomisWrapper.prototype.postComRelation = async function(nomisId, staffId, firstName, lastName, retry = true) {
    try {
        const client = await this.getClient();
        return await client.postComRelation(nomisId, staffId, firstName, lastName);
    } catch (error) {
        if (isRetryable(error) && retry) {
            this.client = null;
            return await this.postComRelation(nomisId, staffId, firstName, lastName, false);
        }
        throw error;
    }
};

function isRetryable(error) {
    return error.status === 401 || error.status === 403;
}
