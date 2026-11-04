package com.jagadeesh.feetracker.dto;

import java.util.List;

public record StudentDetail(StudentResponse student, List<FeeResponse> fees) {
}
