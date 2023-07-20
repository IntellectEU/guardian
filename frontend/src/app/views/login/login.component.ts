import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    AbstractControl,
    FormControl,
    FormGroup,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '@guardian/interfaces';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { Subscription } from 'rxjs';
import { noWhitespaceValidator } from 'src/app/validators/no-whitespace-validator';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { QrCodeDialogComponent } from 'src/app/components/qr-code-dialog/qr-code-dialog.component';
import { MeecoVCSubmitDialogComponent } from 'src/app/components/meeco-vc-submit-dialog/meeco-vc-submit-dialog.component';

/**
 * Login page.
 */
@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
    loading: boolean = false;
    errorMessage: string = '';
    passFieldType: 'password' | 'text' = 'password';
    loginForm = new FormGroup({
        login: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
        password: new FormControl('', [
            Validators.required,
            noWhitespaceValidator(),
        ]),
    });
    initialMeecoBtnTitle: string = 'Meeco Login';
    meecoBtnTitle: string = this.initialMeecoBtnTitle;
    qrCodeDialogRef: MatDialogRef<QrCodeDialogComponent>;
    private _subscriptions: Subscription[] = [];

    constructor(
        private authState: AuthStateService,
        private auth: AuthService,
        private router: Router,
        private wsService: WebSocketService,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        this.loading = false;
        this._subscriptions.push(
            this.authState.credentials.subscribe((credentials) =>
                this.setLogin(credentials.login, credentials.password)
            ),
            this.authState.login.subscribe((credentials) =>
                this.login(credentials.login, credentials.password)
            )
        );

        this.handleMeecoPresentVPMessage();
        this.handleMeecoVPVerification();
        this.handleMeecoVCApproval();
    }

    ngOnDestroy(): void {
        this._subscriptions.forEach((sub) => sub.unsubscribe());
    }

    onLogin() {
        this.errorMessage = '';
        if (this.loginForm.valid) {
            const d = this.loginForm.value;
            this.login(d.login, d.password);
        }
    }

    onMeecoLogin(): void {
        this.meecoBtnTitle = 'Generating QR code...';
        this.wsService.meecoLogin();
    }

    login(login: string, password: string) {
        this.loading = true;
        this.auth.login(login, password).subscribe(
            (result) => {
                this.auth.setAccessToken(result.accessToken);
                this.auth.setUsername(login);
                this.authState.updateState(true);
                if (result.role == UserRole.STANDARD_REGISTRY) {
                    this.router.navigate(['/config']);
                } else {
                    this.router.navigate(['/']);
                }
            },
            ({ message }) => {
                this.loading = false;
                this.errorMessage = message;
            }
        );
    }

    setLogin(login: string, password: string) {
        this.loginForm.setValue({
            login: login,
            password: password,
        });
    }

    togglePasswordShow(): void {
        this.passFieldType =
            this.passFieldType === 'password' ? 'text' : 'password';
    }

    private handleMeecoPresentVPMessage(): void {
        this.wsService.meecoPresentVPSubscribe((event) => {
            this.qrCodeDialogRef = this.dialog.open(QrCodeDialogComponent, {
                panelClass: 'g-dialog',
                disableClose: true,
                autoFocus: false,
                data: {
                    qrCodeData: event.redirectUri,
                },
            });
            this.qrCodeDialogRef
                .afterClosed()
                .subscribe(() => (this.meecoBtnTitle = this.initialMeecoBtnTitle));
        });
    }

    private handleMeecoVPVerification(): void {
        this.wsService.meecoVerifyVPSubscribe((event) => {
            this.qrCodeDialogRef.close();

            this.dialog.open(MeecoVCSubmitDialogComponent, {
                width: '750px',
                disableClose: true,
                autoFocus: false,
                data: {
                    document: event.vc,
                    presentationRequestId: event.presentation_request_id,
                    submissionId: event.submission_id,
                },
            });
        });
    }

    private handleMeecoVCApproval(): void {
        this.wsService.meecoApproveVCSubscribe((event) => {
            // TODO: Add login logic
            // this.auth.setAccessToken(event.jwt);
            // this.auth.setUsername(login);
            // this.authState.updateState(true);
            // if (role == UserRole.STANDARD_REGISTRY) {
            //     this.router.navigate(['/config']);
            // } else {
            //     this.router.navigate(['/']);
            // }
        });
    }

    private get loginControl(): AbstractControl {
        return this.loginForm.get('login') as AbstractControl;
    }

    private get passwordControl(): AbstractControl {
        return this.loginForm.get('password') as AbstractControl;
    }

    private get loginErrors(): ValidationErrors {
        return this.loginControl.errors || {};
    }

    private get passwordErrors(): ValidationErrors {
        return this.passwordControl.errors || {};
    }

    get showLoginRequiredError(): boolean {
        return (
            this.loginControl.touched &&
            (this.loginErrors.required || this.loginErrors.whitespace)
        );
    }

    get showPasswordRequiredError(): boolean {
        return (
            this.passwordControl.touched &&
            (this.passwordErrors.required || this.passwordErrors.whitespace)
        );
    }

    get showPasswordValue(): boolean {
        return this.passFieldType === 'text';
    }

    get shouldDisableMeecoBtn(): boolean {
        return this.meecoBtnTitle !== this.initialMeecoBtnTitle;
    }
}
