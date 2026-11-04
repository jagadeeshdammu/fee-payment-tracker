package com.jagadeesh.feetracker.exception;

/** The request is valid but clashes with existing data (duplicate reference, admission no, ...). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
