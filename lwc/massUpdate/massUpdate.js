import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import updateEposRecords from '@salesforce/apex/EposMassUpdateController.updateEposRecords';
import validateIds from '@salesforce/apex/EposMassUpdateController.validateIds';
import { loadScript } from 'lightning/platformResourceLoader';
import sheetJS from '@salesforce/resourceUrl/sheetjs';

export default class MassUpdateEpos extends LightningElement {

    isFileUploaded = false;
    @track data;
    @track fileName = '';
    @track showSpinner = false;
    selectedCheckboxes = [];
    filesUploaded = [];
    file;
    fileContents;
    fileReader;
    MAX_FILE_SIZE = 1500000;
    MAX_ROWS = 10000; // Maximum allowed rows including the header

    connectedCallback() {
        loadScript(this, sheetJS).then(() => {
            console.log('Script Loaded Successfully');
        }).catch(error => {
            console.error('Error loading static resource', error);
        });
    }

    handleCheckboxChange(event) {
        const { name, checked } = event.target;
        if (checked) {
            this.selectedCheckboxes.push(name);
        } else {
            const index = this.selectedCheckboxes.indexOf(name);
            if (index !== -1) {
                this.selectedCheckboxes.splice(index, 1);
            }
        }
    }

    handleFilesChange(event) {
        if (event.target.files.length > 0) {
            const uploadedFile = event.target.files[0];
            const fileName = uploadedFile.name;
            const fileExtension = fileName.split('.').pop().toLowerCase();
            if (fileExtension !== 'csv') {
                this.fileName = 'Please upload a valid CSV file!';
                this.isFileUploaded = false;
                this.showToast('Error', 'Please upload a valid CSV file.', 'error', 'dismissable');
                return;	
            }
            this.filesUploaded = event.target.files;
            this.fileName = event.target.files[0].name;
            this.isFileUploaded = true;
        }
    }

    handleSave() {
        
        if (this.filesUploaded.length > 0) {
            this.uploadHelper();
        } else {
            this.fileName = 'Please select a CSV file to upload!!';
        }
    }

    uploadHelper() {
        this.file = this.filesUploaded[0];
        if (this.file.size > this.MAX_FILE_SIZE) {
            this.showToast('Error', 'File Size is too large', 'error', 'sticky');
            return;
        }
        this.showSpinner = true;
        this.fileReader = new FileReader();
        this.fileReader.onloadend = () => {
            const rows = this.fileReader.result.split('\n');
            if (rows.length > this.MAX_ROWS) {
                this.fileName = 'CSV file contains more than 10,000 rows!';
                this.showSpinner = false;
                this.showToast('Error', 'The CSV file exceeds the maximum allowed rows of 10,000.', 'error', 'dismissable');
                return;
            }
            this.fileContents = this.modifyCSVData(this.fileReader.result);
            console.log('Modified CSV BULK== ', this.fileContents);
            this.validateIds(this.fileContents.split('\n'));
        };
        this.fileReader.readAsText(this.file);
    }

    updateValidIds(validCsvData) {
        updateEposRecords({ csvData: validCsvData, selectedCheckboxes: this.selectedCheckboxes })
            .then(result => {
                this.data = result;
                this.fileName = `${this.fileName} - Upload Successful`;
                this.showSpinner = false;
                this.showToast('Success', 'Updated Successfully!!!', 'success', 'dismissable');
                this.isFileUploaded = false;
                this.clearCheckBoxSelection();
            })
            .catch(error => {
                console.error('Error updating EPOS records', error);
                this.showToast('Error', 'Failed to update EPOS records', 'error', 'dismissable');
                this.showSpinner = false;
            });
    }
    
    modifyCSVData(csvData) {
        const rows = csvData.split('\n');
        rows.shift();
        const modifiedRows = rows.map(row => {
            const columns = row.split(',');
            return columns[0].replace(/\r/g, '').trim(); 
        }).filter(row => row); 
        return modifiedRows.join('\n');
    }

    validateIds(ids) {
        validateIds({ ids: ids })
            .then(result => {
                const validIds = result.validIds;
                const invalidIds = result.invalidIds;
                console.log('INVALID  IDS===',invalidIds);
                console.log('VALID  IDS===',validIds);

                if (invalidIds.length > 0) {
                    this.exportToExcel(invalidIds);
                    this.showToast('Error', 'Some IDs are invalid. Check the exported file for details.', 'error', 'dismissable');
                }

                if (validIds.length > 0) {
                    this.updateValidIds(validIds.join('\n'));
                } else {
                    this.showSpinner = false;
                }
            })
            .catch(error => {
                console.error('Error validating IDs', error);
                this.showToast('Error', 'Failed to validate IDs', 'error', 'dismissable');
                this.showSpinner = false;
            });
    }


    exportToExcel(invalidIds) {
        console.log('Exported Invalid Ids', invalidIds);
        const hasIssues = invalidIds.length > 0;
        if (hasIssues) {
            console.log('Exporting issues to excel');
            const exportData = [['Invalid IDs']];
            invalidIds.forEach(id => {
                exportData.push([id]);
            });

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(exportData);
            XLSX.utils.book_append_sheet(wb, ws, 'Issues');
            try {
                XLSX.writeFile(wb, 'EPOS_Invalid_IDs_Report.xlsx');
            } catch (error) {
                console.error('Error in Exporting file', error);
            }
        }
    }

    clearCheckBoxSelection(){
        this.selectedCheckboxes=[];
        const checkboxes = [...this.template.querySelectorAll('lightning-input')].filter(input => input.checked);
        checkboxes.forEach(checkbox =>{
            checkbox.checked=false;
        });
    }

    showToast(title, message, variant, mode) {
        const toastEvent = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: mode
        });
        this.dispatchEvent(toastEvent);
    }
}