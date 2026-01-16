<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Notification</title>
    <style>
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            outline: none;
            text-decoration: none;
        }
        
        /* Main styles */
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333333;
            line-height: 1.6;
        }
        
        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        .email-container {
            width: 100%;
            background-color: #ffffff;
        }
        
        .header {
            background: linear-gradient(135deg, #28A745 0%, #34CE57 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            margin: 0;
            color: #ffffff;
            font-size: 28px;
            font-weight: 600;
            letter-spacing: -0.5px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 16px;
            color: #333333;
            margin-bottom: 20px;
        }
        
        .message {
            font-size: 16px;
            color: #555555;
            margin-bottom: 30px;
            line-height: 1.7;
        }
        
        .info-card {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #e9ecef;
        }
        
        .info-row {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        
        .info-label {
            font-size: 12px;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .info-value {
            font-size: 16px;
            color: #333333;
            font-weight: 500;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 25px 0;
            text-align: center;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
            transition: all 0.3s ease;
        }
        
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-text {
            font-size: 13px;
            color: #6c757d;
            line-height: 1.6;
            margin: 5px 0;
        }
        
        .footer-text a {
            color: #FF6B35;
            text-decoration: none;
        }
        
        /* Responsive styles */
        @media only screen and (max-width: 600px) {
            .email-wrapper {
                width: 100% !important;
            }
            
            .header {
                padding: 30px 20px !important;
            }
            
            .header h1 {
                font-size: 24px !important;
            }
            
            .content {
                padding: 30px 20px !important;
            }
            
            .info-card {
                padding: 20px !important;
            }
            
            .cta-button {
                display: block !important;
                width: 100% !important;
                padding: 16px !important;
            }
            
            .footer {
                padding: 25px 20px !important;
            }
        }
    </style>
</head>
<body>
    <div style="background-color: #f5f5f5; padding: 20px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-wrapper">
            <tr>
                <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container">
                        <!-- Header -->
                        <tr>
                            <td class="header">
                                <h1>{{ $notification->title }}</h1>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td class="content">
                                <p class="greeting">Hello,</p>
                                
                                <p class="message">{{ $notification->message }}</p>
                                
                                @php
                                    $data = is_string($notification->data) ? json_decode($notification->data, true) : $notification->data;
                                @endphp
                                
                                @if(isset($data['forwarded_by_email']))
                                <div class="info-card">
                                    <div class="info-row">
                                        <div class="info-label">Forwarded By</div>
                                        <div class="info-value">{{ $data['forwarded_by'] ?? 'Unknown' }}</div>
                                    </div>
                                    <div class="info-row">
                                        <div class="info-label">Email</div>
                                        <div class="info-value">{{ $data['forwarded_by_email'] }}</div>
                                    </div>
                                </div>
                                @endif
                                
                                @if($notification->type === 'document' && isset($data['document_id']))
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="#" class="cta-button">View Document</a>
                                </div>
                                
                                <p class="message" style="margin-top: 30px;">
                                    Please log in to your account to view the document.
                                </p>
                                @endif
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td class="footer">
                                <p class="footer-text">
                                    <strong>Smart Docs System</strong>
                                </p>
                                <p class="footer-text">
                                    This is an automated notification from the Smart Docs system.
                                </p>
                                <p class="footer-text" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #dee2e6;">
                                    Please do not reply to this email.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
