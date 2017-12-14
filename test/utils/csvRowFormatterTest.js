const {expect} = require('../testSetup');
const {
    format
} = require('../../server/utils/csvRowFormatter');

describe('csvRowFormatter', () => {

    describe('format valid record', () => {

        it('should copy the required values and mark as valid', () => {
            expect(format(['nomis', 'pnc', 'staff'])).to.eql({
                offenderNomis: 'nomis',
                offenderPnc: 'pnc',
                staffId: 'staff',
                valid: true
            });
        });
    });

    describe('format invalid record', () => {

        it('should throw error when wrong number of columns', () => {
            expect(function() {
                format(['a', 'b']);
            })
                .to.throw('Invalid number of columns: 2');
        });

        it('should replace missing or blank values with empty string', () => {
            expect(format(['', ' ', '   '])).to.eql({
                offenderNomis: '',
                offenderPnc: '',
                staffId: '',
                valid: false
            });
        });

        it('should replace nomis with empty string when invalid nomis and mark invalid', () => {
            expect(format(['n', 'pnc', 'staff'])).to.eql({
                offenderNomis: '',
                offenderPnc: 'pnc',
                staffId: 'staff',
                valid: false
            });
        });

        it('should replace staffid with empty string when invalid staffid and mark invalid', () => {
            expect(format(['nomis', 'pnc', ''])).to.eql({
                offenderNomis: 'nomis',
                offenderPnc: 'pnc',
                staffId: '',
                valid: false
            });
        });

        it('should replace pnc with empty string when invalid pnc but mark valid', () => {
            expect(format(['nomis', 'p', 'staff'])).to.eql({
                offenderNomis: 'nomis',
                offenderPnc: '',
                staffId: 'staff',
                valid: true
            });
        });

        it('should mark invalid if nomis missing', () => {
            expect(format(['', 'pnc', 'staff'])).to.eql({
                offenderNomis: '',
                offenderPnc: 'pnc',
                staffId: 'staff',
                valid: false
            });
        });

        it('should mark invalid if staff id missing', () => {
            expect(format(['nomis', 'pnc', ''])).to.eql({
                offenderNomis: 'nomis',
                offenderPnc: 'pnc',
                staffId: '',
                valid: false
            });
        });

    });

});
