package models

import "time"

type User struct {
    ID                 int64      `db:"id" json:"id"`
    Name               string     `db:"name" json:"name"`
    Email              string     `db:"email" json:"email"`
    Password           string     `db:"password" json:"-"`
    Phone              *string    `db:"phone" json:"phone"`
    IsPremium          bool       `db:"is_premium" json:"is_premium"`
    PremiumExpiresAt   *time.Time `db:"premium_expires_at" json:"premium_expires_at"`
    IsDeleted          bool       `db:"is_deleted" json:"-"`
    ResetToken         *string    `db:"reset_token" json:"-"`
    ResetTokenExpires  *time.Time `db:"reset_token_expires" json:"-"`
    CreatedAt          time.Time  `db:"created_at" json:"created_at"`
    UpdatedAt          time.Time  `db:"updated_at" json:"updated_at"`
}
type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type ResetPasswordRequest struct {
	Token    string `json:"token" validate:"required"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}